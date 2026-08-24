from datetime import datetime, date, time, timedelta
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.datetime_utils import agora_local
from app.agendamentos.models import Agendamento, AlocacaoOperacional, HistoricoAgendamento
from app.agendamentos.schemas import (
    AgendamentoCreate,
    AgendamentoUpdate,
    AlocacaoOperacionalCreate,
    AlocacaoOperacionalUpdate,
)
from app.contratos.models import MotoristaDedicadoVinculo
from app.contratos.services import obter_configuracao_vigente
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.operacao.models import EventoOperacional, MotivoIndisponibilidade
from app.operacao.services import OperacaoService, HORARIO_LIMITE_AGENDAMENTO_CHAVE

TRANSICOES_AGENDAMENTO_PERMITIDAS = {
    "RASCUNHO": ["PROGRAMADO", "CANCELADO"],
    "PROGRAMADO": ["EM_EXECUCAO", "CANCELADO"],
    "EM_EXECUCAO": ["CONCLUIDO", "CANCELADO"],
    "CONCLUIDO": [],
    "CANCELADO": [],
}

TRANSICOES_OPERACIONAIS_PERMITIDAS = {
    "DISPONIVEL": ["PROGRAMADO", "INDISPONIVEL"],
    "PROGRAMADO": ["EM_ROTA", "INDISPONIVEL", "DISPONIVEL"],
    "EM_ROTA": ["DISPONIVEL", "INDISPONIVEL"],
    "INDISPONIVEL": ["DISPONIVEL"],
}

class AgendamentoService:
    @staticmethod
    def validar_janela_criacao(db: Session, data_agendamento: date) -> None:
        agora = agora_local()
        hoje = agora.date()
        amanha = hoje + timedelta(days=1)

        if data_agendamento < hoje:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é permitido criar agendamentos para datas retroativas.",
            )

        if data_agendamento > amanha:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No MVP, é permitido criar agendamentos apenas para o dia atual ou dia seguinte.",
            )

        if data_agendamento == hoje:
            str_limite = OperacaoService.obter_configuracao(db, HORARIO_LIMITE_AGENDAMENTO_CHAVE)
            partes = str_limite.split(":")
            horario_limite = time(int(partes[0]), int(partes[1]))

            if agora.time() > horario_limite:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Não é permitido criar agendamentos para o dia atual após o horário limite de {str_limite}.",
                )

    @staticmethod
    def verificar_conflito_alocacao(
        db: Session, motorista_id: UUID, veiculo_id: UUID, agendamento_id: UUID
    ) -> None:
        """Verifica se motorista ou veículo já possuem alocação ativa e conflitante em outro agendamento, com bloqueio pessimista."""
        # Adquire trava pessimista (FOR UPDATE) no motorista e no veículo para serializar transações concorrentes simultâneas
        if motorista_id:
            db.query(Motorista).filter(Motorista.id == motorista_id).with_for_update().first()
        if veiculo_id:
            db.query(Veiculo).filter(Veiculo.id == veiculo_id).with_for_update().first()

        agendamento_alvo = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
        if not agendamento_alvo:
            return

        # Conflito de Motorista
        conflito_motorista = (
            db.query(AlocacaoOperacional)
            .join(Agendamento)
            .filter(
                AlocacaoOperacional.motorista_id == motorista_id,
                AlocacaoOperacional.agendamento_id != agendamento_id,
                Agendamento.data == agendamento_alvo.data,
                Agendamento.status.in_(["PROGRAMADO", "EM_EXECUCAO"]),
                AlocacaoOperacional.status_operacional.in_(["PROGRAMADO", "EM_ROTA"]),
            )
            .first()
        )
        if conflito_motorista:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O motorista informado já está alocado e ativo em outra operação simultânea.",
            )

        # Conflito de Veículo
        conflito_veiculo = (
            db.query(AlocacaoOperacional)
            .join(Agendamento)
            .filter(
                AlocacaoOperacional.veiculo_id == veiculo_id,
                AlocacaoOperacional.agendamento_id != agendamento_id,
                Agendamento.data == agendamento_alvo.data,
                Agendamento.status.in_(["PROGRAMADO", "EM_EXECUCAO"]),
                AlocacaoOperacional.status_operacional.in_(["PROGRAMADO", "EM_ROTA"]),
            )
            .first()
        )
        if conflito_veiculo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O veículo informado já está alocado e ativo em outra operação simultânea.",
            )

    @staticmethod
    def criar_agendamento(db: Session, dados: AgendamentoCreate, usuario_id: UUID) -> Agendamento:
        AgendamentoService.validar_janela_criacao(db, dados.data)

        # Valida se a empresa já possui um agendamento ativo/não-cancelado registrado para esta mesma data
        agendamento_existente = (
            db.query(Agendamento)
            .filter(
                Agendamento.empresa_id == dados.empresa_id,
                Agendamento.data == dados.data,
                Agendamento.status != "CANCELADO",
            )
            .first()
        )
        if agendamento_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um agendamento ativo registrado para esta empresa na data {dados.data.strftime('%d/%m/%Y')}. Alterações na programação devem ser realizadas dentro da página de detalhes do agendamento existente.",
            )

        # Captura a configuração contratual vigente na data do agendamento
        config_vigente = obter_configuracao_vigente(
            db, dados.empresa_id, datetime.combine(dados.data, time(0, 0, 0))
        )
        contrato_config_id = config_vigente.id if config_vigente else None

        agendamento = Agendamento(
            empresa_id=dados.empresa_id,
            data=dados.data,
            horario_inicio=dados.horario_inicio or time(8, 0, 0),
            status="PROGRAMADO",
            criado_por_id=usuario_id,
            contrato_configuracao_id=contrato_config_id,
        )
        db.add(agendamento)
        db.commit()
        db.refresh(agendamento)

        # Preenchimento automático dos motoristas/veículos DEDICADOS da empresa
        vinculos_dedicados = (
            db.query(MotoristaDedicadoVinculo)
            .filter(
                MotoristaDedicadoVinculo.empresa_id == dados.empresa_id,
                MotoristaDedicadoVinculo.ativo == True,
                MotoristaDedicadoVinculo.categoria_operacional == "DEDICADO",
            )
            .all()
        )

        for vinculo in vinculos_dedicados:
            if vinculo.motorista_id and vinculo.veiculo_id:
                alocacao = AlocacaoOperacional(
                    agendamento_id=agendamento.id,
                    motorista_id=vinculo.motorista_id,
                    veiculo_id=vinculo.veiculo_id,
                    categoria="DEDICADO",
                    status_operacional="PROGRAMADO",
                )
                db.add(alocacao)

        # Histórico de criação
        historico = HistoricoAgendamento(
            agendamento_id=agendamento.id,
            alterado_por_id=usuario_id,
            tipo_alteracao="CRIACAO",
            descricao=f"Agendamento criado para {agendamento.data} às {agendamento.horario_inicio} com {len(vinculos_dedicados)} dedicados vinculados.",
        )
        db.add(historico)
        db.commit()
        db.refresh(agendamento)

        return agendamento

    @staticmethod
    def buscar_por_id(db: Session, agendamento_id: UUID) -> Agendamento:
        agendamento = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
        if not agendamento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agendamento não encontrado.",
            )
        return agendamento

    @staticmethod
    def listar(
        db: Session,
        empresa_id: Optional[UUID] = None,
        data: Optional[date] = None,
        status_filtro: Optional[str] = None,
        limite: int = 50,
        offset: int = 0,
    ) -> List[Agendamento]:
        query = db.query(Agendamento)
        if empresa_id:
            query = query.filter(Agendamento.empresa_id == empresa_id)
        if data:
            query = query.filter(Agendamento.data == data)
        if status_filtro:
            query = query.filter(Agendamento.status == status_filtro)
        return query.order_by(Agendamento.data.desc(), Agendamento.horario_inicio.asc()).offset(offset).limit(limite).all()

    @staticmethod
    def contar_total(
        db: Session,
        empresa_id: Optional[UUID] = None,
        data: Optional[date] = None,
        status_filtro: Optional[str] = None,
    ) -> int:
        query = db.query(Agendamento)
        if empresa_id:
            query = query.filter(Agendamento.empresa_id == empresa_id)
        if data:
            query = query.filter(Agendamento.data == data)
        if status_filtro:
            query = query.filter(Agendamento.status == status_filtro)
        return query.count()

    @staticmethod
    def obter_historico_agendamento(db: Session, agendamento_id: UUID) -> List[HistoricoAgendamento]:
        AgendamentoService.buscar_por_id(db, agendamento_id)
        return (
            db.query(HistoricoAgendamento)
            .filter(HistoricoAgendamento.agendamento_id == agendamento_id)
            .order_by(HistoricoAgendamento.criado_em.asc())
            .all()
        )

    @staticmethod
    def atualizar_agendamento(
        db: Session, agendamento_id: UUID, dados: AgendamentoUpdate, usuario_id: UUID
    ) -> Agendamento:
        agendamento = AgendamentoService.buscar_por_id(db, agendamento_id)

        if agendamento.status in ["CONCLUIDO", "CANCELADO"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é permitido alterar um agendamento com status {agendamento.status}.",
            )

        alteracoes = []

        if dados.horario_inicio is not None and dados.horario_inicio != agendamento.horario_inicio:
            alteracoes.append(f"Horário de início alterado de {agendamento.horario_inicio} para {dados.horario_inicio}")
            agendamento.horario_inicio = dados.horario_inicio

        if dados.status is not None and dados.status != agendamento.status:
            status_atual = agendamento.status
            novo_status = dados.status
            if novo_status not in TRANSICOES_AGENDAMENTO_PERMITIDAS.get(status_atual, []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Transição de status inválida: {status_atual} -> {novo_status}.",
                )
            alteracoes.append(f"Status alterado de {status_atual} para {novo_status}")
            agendamento.status = novo_status

        if alteracoes:
            db.commit()
            db.refresh(agendamento)

            historico = HistoricoAgendamento(
                agendamento_id=agendamento.id,
                alterado_por_id=usuario_id,
                tipo_alteracao="ATUALIZACAO",
                descricao="; ".join(alteracoes),
            )
            db.add(historico)
            db.commit()

        return agendamento

    @staticmethod
    def cancelar_agendamento(db: Session, agendamento_id: UUID, usuario_id: UUID) -> Agendamento:
        return AgendamentoService.atualizar_agendamento(
            db, agendamento_id, AgendamentoUpdate(status="CANCELADO"), usuario_id
        )

    # --- Gestão de Alocações (Dedicados & SPOT) ---

    @staticmethod
    def adicionar_spot(
        db: Session, agendamento_id: UUID, dados: AlocacaoOperacionalCreate, usuario_id: UUID
    ) -> AlocacaoOperacional:
        agendamento = AgendamentoService.buscar_por_id(db, agendamento_id)
        if agendamento.status in ["CONCLUIDO", "CANCELADO"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é permitido adicionar SPOT em agendamento {agendamento.status}.",
            )

        AgendamentoService.verificar_conflito_alocacao(
            db, dados.motorista_id, dados.veiculo_id, agendamento_id
        )

        alocacao = AlocacaoOperacional(
            agendamento_id=agendamento_id,
            motorista_id=dados.motorista_id,
            veiculo_id=dados.veiculo_id,
            categoria="SPOT",
            status_operacional="PROGRAMADO",
        )
        db.add(alocacao)
        db.commit()
        db.refresh(alocacao)

        historico = HistoricoAgendamento(
            agendamento_id=agendamento_id,
            alterado_por_id=usuario_id,
            tipo_alteracao="INCLUSAO_SPOT",
            descricao=f"Alocação SPOT adicionada (Motorista: {dados.motorista_id}, Veículo: {dados.veiculo_id}).",
        )
        db.add(historico)
        db.commit()

        return alocacao

    @staticmethod
    def substituir_spot(
        db: Session, alocacao_id: UUID, dados: AlocacaoOperacionalCreate, usuario_id: UUID
    ) -> AlocacaoOperacional:
        alocacao_antiga = db.query(AlocacaoOperacional).filter(AlocacaoOperacional.id == alocacao_id).first()
        if not alocacao_antiga:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alocação operacional não encontrada.",
            )

        if alocacao_antiga.categoria != "SPOT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas alocações da categoria SPOT podem ser substituídas.",
            )

        agendamento = AgendamentoService.buscar_por_id(db, alocacao_antiga.agendamento_id)
        if agendamento.status in ["CONCLUIDO", "CANCELADO"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é permitido substituir SPOT em agendamento {agendamento.status}.",
            )

        # Trava pessimista e verificação de conflitos para o novo motorista e veículo
        AgendamentoService.verificar_conflito_alocacao(
            db, dados.motorista_id, dados.veiculo_id, agendamento.id
        )

        agendamento_id = agendamento.id
        motorista_antigo_id = alocacao_antiga.motorista_id
        veiculo_antigo_id = alocacao_antiga.veiculo_id

        # Remove a alocação antiga
        db.delete(alocacao_antiga)
        db.flush()

        # Cria a nova alocação SPOT
        nova_alocacao = AlocacaoOperacional(
            agendamento_id=agendamento_id,
            motorista_id=dados.motorista_id,
            veiculo_id=dados.veiculo_id,
            categoria="SPOT",
            status_operacional="PROGRAMADO",
        )
        db.add(nova_alocacao)

        # Histórico
        historico = HistoricoAgendamento(
            agendamento_id=agendamento_id,
            alterado_por_id=usuario_id,
            tipo_alteracao="SUBSTITUICAO_SPOT",
            descricao=f"Alocação SPOT {alocacao_id} substituída. Antigo (Motorista: {motorista_antigo_id}, Veículo: {veiculo_antigo_id}) -> Novo (Motorista: {dados.motorista_id}, Veículo: {dados.veiculo_id}).",
        )
        db.add(historico)
        db.commit()
        db.refresh(nova_alocacao)

        return nova_alocacao

    @staticmethod
    def remover_spot(db: Session, alocacao_id: UUID, usuario_id: UUID) -> None:
        alocacao = db.query(AlocacaoOperacional).filter(AlocacaoOperacional.id == alocacao_id).first()
        if not alocacao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alocação operacional não encontrada.",
            )

        if alocacao.categoria != "SPOT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas alocações da categoria SPOT podem ser removidas do agendamento.",
            )

        agendamento_id = alocacao.agendamento_id
        db.delete(alocacao)
        db.commit()

        historico = HistoricoAgendamento(
            agendamento_id=agendamento_id,
            alterado_por_id=usuario_id,
            tipo_alteracao="REMOCAO_SPOT",
            descricao=f"Alocação SPOT {alocacao_id} removida do agendamento.",
        )
        db.add(historico)
        db.commit()

    @staticmethod
    def atualizar_status_operacional(
        db: Session,
        alocacao_id: UUID,
        novo_status: str,
        motivo_indisponibilidade_id: Optional[UUID],
        origem: Optional[str],
        usuario_id: UUID,
    ) -> AlocacaoOperacional:
        alocacao = db.query(AlocacaoOperacional).filter(AlocacaoOperacional.id == alocacao_id).first()
        if not alocacao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alocação operacional não encontrada.",
            )

        status_anterior = alocacao.status_operacional

        if novo_status not in TRANSICOES_OPERACIONAIS_PERMITIDAS.get(status_anterior, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transição de status operacional inválida: {status_anterior} -> {novo_status}.",
            )

        nome_motivo = None
        if novo_status == "INDISPONIVEL":
            if not motivo_indisponibilidade_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="É obrigatório informar o motivo de indisponibilidade.",
                )
            motivo = OperacaoService.buscar_motivo_por_id(db, motivo_indisponibilidade_id)
            nome_motivo = motivo.nome
            alocacao.motivo_indisponibilidade_id = motivo_indisponibilidade_id
        else:
            alocacao.motivo_indisponibilidade_id = None

        alocacao.status_operacional = novo_status
        db.commit()
        db.refresh(alocacao)

        # Registro imutável do Evento Operacional
        evento = EventoOperacional(
            empresa_id=alocacao.agendamento.empresa_id,
            motorista_id=alocacao.motorista_id,
            veiculo_id=alocacao.veiculo_id,
            agendamento_id=alocacao.agendamento_id,
            categoria=alocacao.categoria,
            status_anterior=status_anterior,
            novo_status=novo_status,
            motivo_indisponibilidade=nome_motivo,
            usuario_id=usuario_id,
            origem_alteracao=origem or "painel_operacional",
        )
        db.add(evento)
        db.commit()

        return alocacao
