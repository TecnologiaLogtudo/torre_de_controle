from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime, time
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.datetime_utils import inicio_do_dia_utc, fim_do_dia_utc, agora_local
from app.contratos.services import obter_configuracao_vigente
from app.operacao.models import MotivoIndisponibilidade, ConfiguracaoSistema, EventoOperacional
from app.operacao.schemas import (
    MotivoIndisponibilidadeCreate,
    MotivoIndisponibilidadeUpdate,
    ConfiguracaoSistemaCreate,
    ConfiguracaoSistemaUpdate,
    ResumoTorreResponse,
    ResumoEmpresaTorreResponse,
    DetalhamentoOperacionalResponse,
)
from app.agendamentos.models import Agendamento, AlocacaoOperacional
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo

MOTIVOS_PADRAO_INICIAIS = [
    "Avaria",
    "Manutenção",
    "Ausência do motorista",
    "Problema documental",
    "Acidente",
    "Problema mecânico",
    "Problema operacional",
    "Outro",
]

HORARIO_LIMITE_AGENDAMENTO_CHAVE = "horario_limite_agendamento_dia_atual"
HORARIO_LIMITE_AGENDAMENTO_PADRAO = "12:00"
DIAS_ANTECEDENCIA_MAXIMA_AGENDAMENTO_CHAVE = "dias_antecedencia_maxima_agendamento"
DIAS_ANTECEDENCIA_MAXIMA_AGENDAMENTO_PADRAO = "1"

class OperacaoService:
    @staticmethod
    def inicializar_dados_padrao(db: Session) -> None:
        """Garante que os motivos de indisponibilidade e configurações padrão existam."""
        for nome_motivo in MOTIVOS_PADRAO_INICIAIS:
            existente = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.nome == nome_motivo).first()
            if not existente:
                db.add(MotivoIndisponibilidade(nome=nome_motivo, ativo=True))
        
        config_horario = db.query(ConfiguracaoSistema).filter(ConfiguracaoSistema.chave == HORARIO_LIMITE_AGENDAMENTO_CHAVE).first()
        if not config_horario:
            db.add(ConfiguracaoSistema(chave=HORARIO_LIMITE_AGENDAMENTO_CHAVE, valor=HORARIO_LIMITE_AGENDAMENTO_PADRAO))

        config_antecedencia = db.query(ConfiguracaoSistema).filter(ConfiguracaoSistema.chave == DIAS_ANTECEDENCIA_MAXIMA_AGENDAMENTO_CHAVE).first()
        if not config_antecedencia:
            db.add(ConfiguracaoSistema(chave=DIAS_ANTECEDENCIA_MAXIMA_AGENDAMENTO_CHAVE, valor=DIAS_ANTECEDENCIA_MAXIMA_AGENDAMENTO_PADRAO))

        db.commit()

    # --- Motivos de Indisponibilidade ---
    @staticmethod
    def listar_motivos(db: Session, apenas_ativos: bool = False) -> List[MotivoIndisponibilidade]:
        query = db.query(MotivoIndisponibilidade)
        if apenas_ativos:
            query = query.filter(MotivoIndisponibilidade.ativo == True)
        return query.order_by(MotivoIndisponibilidade.nome).all()

    @staticmethod
    def buscar_motivo_por_id(db: Session, motivo_id: UUID) -> MotivoIndisponibilidade:
        motivo = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.id == motivo_id).first()
        if not motivo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Motivo de indisponibilidade não encontrado.",
            )
        return motivo

    @staticmethod
    def criar_motivo(db: Session, dados: MotivoIndisponibilidadeCreate) -> MotivoIndisponibilidade:
        existente = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.nome == dados.nome).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um motivo de indisponibilidade com esse nome.",
            )
        motivo = MotivoIndisponibilidade(**dados.model_dump())
        db.add(motivo)
        db.commit()
        db.refresh(motivo)
        return motivo

    @staticmethod
    def atualizar_motivo(db: Session, motivo_id: UUID, dados: MotivoIndisponibilidadeUpdate) -> MotivoIndisponibilidade:
        motivo = OperacaoService.buscar_motivo_por_id(db, motivo_id)
        
        if dados.nome is not None and dados.nome != motivo.nome:
            existente = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.nome == dados.nome).first()
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Já existe um motivo de indisponibilidade com esse nome.",
                )
            motivo.nome = dados.nome

        if dados.ativo is not None:
            motivo.ativo = dados.ativo

        db.commit()
        db.refresh(motivo)
        return motivo

    # --- Configurações do Sistema ---
    @staticmethod
    def obter_configuracao(db: Session, chave: str) -> str:
        config = OperacaoService.obter_configuracao_objeto(db, chave)
        return config.valor

    @staticmethod
    def obter_configuracao_objeto(db: Session, chave: str) -> ConfiguracaoSistema:
        config = db.query(ConfiguracaoSistema).filter(ConfiguracaoSistema.chave == chave).first()
        if not config:
            if chave == HORARIO_LIMITE_AGENDAMENTO_CHAVE:
                config = ConfiguracaoSistema(chave=chave, valor=HORARIO_LIMITE_AGENDAMENTO_PADRAO)
                db.add(config)
                db.commit()
                db.refresh(config)
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Configuração '{chave}' não encontrada.",
                )
        return config

    @staticmethod
    def listar_configuracoes(db: Session) -> List[ConfiguracaoSistema]:
        return db.query(ConfiguracaoSistema).all()

    @staticmethod
    def atualizar_configuracao(db: Session, chave: str, valor: str) -> ConfiguracaoSistema:
        config = db.query(ConfiguracaoSistema).filter(ConfiguracaoSistema.chave == chave).first()
        if not config:
            config = ConfiguracaoSistema(chave=chave, valor=valor)
            db.add(config)
        else:
            config.valor = valor
        db.commit()
        db.refresh(config)
        return config

    # --- Torre de Controle (Painel & Indicadores) ---
    @staticmethod
    def obter_resumo_geral(
        db: Session,
        data_filtro: Optional[date] = None,
        empresa_id: Optional[UUID] = None,
    ) -> ResumoTorreResponse:
        data_ref = data_filtro or agora_local().date()
        resumo_empresas = OperacaoService.obter_resumo_por_empresa(db, data_ref)

        if empresa_id:
            resumo_empresas = [r for r in resumo_empresas if r.empresa_id == empresa_id]
            contratados = sum(r.contratados for r in resumo_empresas)
            total = sum(r.total for r in resumo_empresas)
            disponiveis = sum(r.disponiveis for r in resumo_empresas)
            programados = sum(r.programados for r in resumo_empresas)
            em_rota = sum(r.em_rota for r in resumo_empresas)
            indisponiveis = sum(r.indisponiveis for r in resumo_empresas)
            vagas_nao_preenchidas = sum(r.vagas_nao_preenchidas for r in resumo_empresas)

            return ResumoTorreResponse(
                contratados=contratados,
                total=total,
                disponiveis=disponiveis,
                programados=programados,
                em_rota=em_rota,
                indisponiveis=indisponiveis,
                vagas_nao_preenchidas=vagas_nao_preenchidas,
            )

        # Sem filtro de empresa: Visão Consolidada Geral da Torre de Controle
        contratados = sum(r.contratados for r in resumo_empresas)
        vagas_nao_preenchidas = sum(r.vagas_nao_preenchidas for r in resumo_empresas)

        # Obtém o status consolidado de todos os motoristas ativos na data (inclui dedicados e spots)
        status_geral = OperacaoService.obter_status_motoristas(db, data_ref)

        programados = sum(1 for m in status_geral.motoristas if m.status_operacional == "PROGRAMADO")
        em_rota = sum(1 for m in status_geral.motoristas if m.status_operacional == "EM_ROTA")
        disponiveis = sum(1 for m in status_geral.motoristas if m.status_operacional == "DISPONIVEL")
        indisponiveis = sum(1 for m in status_geral.motoristas if m.status_operacional == "INDISPONIVEL")
        total = programados + em_rota + disponiveis + indisponiveis

        return ResumoTorreResponse(
            contratados=contratados,
            total=total,
            disponiveis=disponiveis,
            programados=programados,
            em_rota=em_rota,
            indisponiveis=indisponiveis,
            vagas_nao_preenchidas=vagas_nao_preenchidas,
        )

    @staticmethod
    def obter_resumo_por_empresa(db: Session, data_filtro: Optional[date] = None) -> List[ResumoEmpresaTorreResponse]:
        data_ref = data_filtro or agora_local().date()
        empresas = db.query(Empresa).filter(Empresa.ativo == True).all()
        resultado = []

        for emp in empresas:
            # Obtém a configuração de capacidade contratual vigente na data
            dt_ref = datetime.combine(data_ref, time(0, 0, 0))
            config_vigente = obter_configuracao_vigente(db, emp.id, dt_ref)
            regras_dict = {}
            if config_vigente and config_vigente.regras:
                if isinstance(config_vigente.regras, list):
                    for item in config_vigente.regras:
                        if isinstance(item, dict):
                            tipo = str(item.get("tipo_veiculo", ""))
                            qtd = int(item.get("quantidade", 1))
                            regras_dict[tipo] = regras_dict.get(tipo, 0) + qtd
                elif isinstance(config_vigente.regras, dict):
                    regras_dict = {str(k): int(v) for k, v in config_vigente.regras.items()}
            contratados = sum(regras_dict.values())

            query = db.query(AlocacaoOperacional).join(Agendamento).filter(
                Agendamento.empresa_id == emp.id,
                Agendamento.data == data_ref,
                Agendamento.status != "CANCELADO",
            )

            alocacoes = query.all()
            # Apenas alocações que pertencem de fato à empresa (dedicados ou spots agendados/em rota)
            alocacoes_empresa = [
                a for a in alocacoes
                if a.categoria != "SPOT" or a.status_operacional in ("PROGRAMADO", "EM_ROTA", "INDISPONIVEL")
            ]
            total = len(alocacoes_empresa)
            # Motoristas SPOT livres não entram como disponíveis na empresa parceira
            disponiveis = sum(1 for a in alocacoes_empresa if a.status_operacional == "DISPONIVEL" and a.categoria != "SPOT")
            programados = sum(1 for a in alocacoes_empresa if a.status_operacional == "PROGRAMADO")
            em_rota = sum(1 for a in alocacoes_empresa if a.status_operacional == "EM_ROTA")
            indisponiveis = sum(1 for a in alocacoes_empresa if a.status_operacional == "INDISPONIVEL")
            vagas_nao_preenchidas = max(0, contratados - total)

            resultado.append(
                ResumoEmpresaTorreResponse(
                    empresa_id=emp.id,
                    empresa_nome=emp.nome,
                    contratados=contratados,
                    total=total,
                    disponiveis=disponiveis,
                    programados=programados,
                    em_rota=em_rota,
                    indisponiveis=indisponiveis,
                    vagas_nao_preenchidas=vagas_nao_preenchidas,
                    regras_capacidade=regras_dict,
                )
            )

        return resultado

    @staticmethod
    def obter_detalhamento_operacional(
        db: Session,
        data_filtro: Optional[date] = None,
        empresa_id: Optional[UUID] = None,
        status_filtro: Optional[str] = None,
        categoria: Optional[str] = None,
        tipo_veiculo: Optional[str] = None,
        especialidade: Optional[str] = None,
        placa: Optional[str] = None,
        motorista_nome: Optional[str] = None,
        motorista_id: Optional[UUID] = None,
        limite: int = 1000,
        offset: int = 0,
    ) -> List[DetalhamentoOperacionalResponse]:
        filtro_recursos_cockpit = or_(
            AlocacaoOperacional.categoria != "SPOT",
            and_(
                AlocacaoOperacional.categoria == "SPOT",
                AlocacaoOperacional.status_operacional.in_(["PROGRAMADO", "EM_ROTA"]),
            ),
        )

        query = (
            db.query(AlocacaoOperacional)
            .join(Agendamento)
            .join(Motorista)
            .join(Veiculo)
            .join(Empresa, Agendamento.empresa_id == Empresa.id)
            .filter(
                Agendamento.status != "CANCELADO",
                filtro_recursos_cockpit,
            )
        )

        if data_filtro:
            query = query.filter(Agendamento.data == data_filtro)
        if empresa_id:
            query = query.filter(Agendamento.empresa_id == empresa_id)
        if status_filtro:
            query = query.filter(AlocacaoOperacional.status_operacional == status_filtro)
        if categoria:
            query = query.filter(AlocacaoOperacional.categoria == categoria)
        if tipo_veiculo:
            query = query.filter(Veiculo.tipo_veiculo == tipo_veiculo)
        if especialidade:
            query = query.filter(Veiculo.especialidade == especialidade)
        if placa:
            query = query.filter(Veiculo.placa.ilike(f"%{placa}%"))
        if motorista_nome:
            query = query.filter(Motorista.nome.ilike(f"%{motorista_nome}%"))
        if motorista_id:
            query = query.filter(AlocacaoOperacional.motorista_id == motorista_id)

        alocacoes = query.offset(offset).limit(limite).all()
        resultado = []

        for a in alocacoes:
            motivo_nome = a.motivo_indisponibilidade.nome if a.motivo_indisponibilidade else None
            resultado.append(
                DetalhamentoOperacionalResponse(
                    empresa_id=a.agendamento.empresa_id,
                    empresa_nome=a.agendamento.empresa.nome,
                    motorista_id=a.motorista_id,
                    motorista_nome=a.motorista.nome,
                    veiculo_id=a.veiculo_id,
                    veiculo_identificacao=a.veiculo.identificacao,
                    placa=a.veiculo.placa,
                    tipo_veiculo=a.veiculo.tipo_veiculo,
                    especialidade=a.veiculo.especialidade,
                    categoria=a.categoria,
                    status_operacional=a.status_operacional,
                    motivo_indisponibilidade=motivo_nome,
                    agendamento_id=a.agendamento_id,
                    alocacao_id=a.id,
                )
            )

        return resultado

    # --- Status de Motoristas (Visão Consolidada por Motorista) ---
    @staticmethod
    def obter_status_motoristas(
        db: Session,
        data_filtro: Optional[date] = None,
        empresa_id: Optional[UUID] = None,
        motorista_nome: Optional[str] = None,
    ) -> "MotoristasStatusResponse":
        from app.operacao.schemas import MotoristaStatusResponse, MotoristasStatusResponse
        from sqlalchemy import func

        data_ref = data_filtro or agora_local().date()

        # Alocações do dia (fonte primária do status operacional)
        query = (
            db.query(AlocacaoOperacional, Agendamento)
            .join(Agendamento, AlocacaoOperacional.agendamento_id == Agendamento.id)
            .filter(
                Agendamento.data == data_ref,
                Agendamento.status != "CANCELADO",
            )
        )
        if empresa_id:
            query = query.filter(Agendamento.empresa_id == empresa_id)

        alocacoes: Dict[UUID, AlocacaoOperacional] = {}
        for aloc, ag in query.all():
            if empresa_id and ag.empresa_id != empresa_id:
                continue
            # Um motorista pode ter mais de uma alocação no dia: prioriza EM_ROTA > INDISPONIVEL > PROGRAMADO > DISPONIVEL
            prioridade = {"EM_ROTA": 3, "INDISPONIVEL": 2, "PROGRAMADO": 1, "DISPONIVEL": 0}
            atual = alocacoes.get(aloc.motorista_id)
            if atual is None or prioridade.get(aloc.status_operacional, -1) > prioridade.get(atual.status_operacional, -1):
                alocacoes[aloc.motorista_id] = aloc

        # Motoristas ativos (base do consolidado)
        q_motoristas = db.query(Motorista).filter(Motorista.ativo == True)
        if motorista_nome:
            q_motoristas = q_motoristas.filter(Motorista.nome.ilike(f"%{motorista_nome}%"))
        motoristas = q_motoristas.order_by(Motorista.nome).all()

        # Vínculos dedicados ativos para enriquecer empresa/veículo/categoria
        from app.contratos.models import MotoristaDedicadoVinculo
        from app.operacao.models import StatusOperacionalMotorista
        vinculos = db.query(MotoristaDedicadoVinculo).filter(MotoristaDedicadoVinculo.ativo == True).all()

        # Status diários de motoristas gravados sem agendamento
        status_diarios = {
            s.motorista_id: s
            for s in db.query(StatusOperacionalMotorista)
            .filter(StatusOperacionalMotorista.data == data_ref)
            .all()
        }

        resultado: List[MotoristaStatusResponse] = []
        contagem = {"DISPONIVEL": 0, "PROGRAMADO": 0, "EM_ROTA": 0, "INDISPONIVEL": 0, "SEM_ALOCACAO": 0}

        for m in motoristas:
            aloc = alocacoes.get(m.id)
            vinculo = next((v for v in vinculos if v.motorista_id == m.id and v.ativo), None)

            if aloc:
                status_op = aloc.status_operacional
                # Se for categoria SPOT e não tiver vínculo dedicado com empresa, não exibe empresa_nome
                if aloc.categoria == "SPOT" and (not vinculo or not vinculo.empresa_id):
                    empresa_nome = None
                    empresa_id_resp = None
                else:
                    empresa_nome = aloc.agendamento.empresa.nome if aloc.agendamento.empresa else None
                    empresa_id_resp = aloc.agendamento.empresa_id
                veiculo_id_resp = aloc.veiculo_id
                veiculo = aloc.veiculo
                placa = veiculo.placa if veiculo else None
                veiculo_tipo = veiculo.tipo_veiculo if veiculo else None
                veiculo_especialidade = veiculo.especialidade if veiculo else None
                categoria = aloc.categoria
                motivo = aloc.motivo_indisponibilidade.nome if aloc.motivo_indisponibilidade else None
                agendamento_id = aloc.agendamento_id
                alocacao_id = aloc.id
            else:
                s_diario = status_diarios.get(m.id)
                if s_diario:
                    status_op = s_diario.status_operacional
                    motivo = s_diario.motivo_indisponibilidade.nome if s_diario.motivo_indisponibilidade else None
                else:
                    status_op = "SEM_ALOCACAO"
                    motivo = None

                empresa_id_resp = vinculo.empresa_id if vinculo else None
                empresa_nome = None
                if empresa_id_resp:
                    emp = db.query(Empresa).filter(Empresa.id == empresa_id_resp).first()
                    empresa_nome = emp.nome if emp else None
                veiculo_id_resp = vinculo.veiculo_id if vinculo else None
                placa = None
                veiculo_tipo = None
                veiculo_especialidade = None
                if veiculo_id_resp:
                    vec = db.query(Veiculo).filter(Veiculo.id == veiculo_id_resp).first()
                    if vec:
                        placa = vec.placa
                        veiculo_tipo = vec.tipo_veiculo
                        veiculo_especialidade = vec.especialidade
                categoria = vinculo.categoria_operacional if vinculo else "SPOT"
                agendamento_id = None
                alocacao_id = None

            if empresa_id and empresa_id_resp != empresa_id:
                continue

            if status_op in contagem:
                contagem[status_op] += 1

            resultado.append(
                MotoristaStatusResponse(
                    motorista_id=m.id,
                    motorista_nome=m.nome,
                    empresa_id=empresa_id_resp,
                    empresa_nome=empresa_nome,
                    veiculo_id=veiculo_id_resp,
                    veiculo_placa=placa,
                    veiculo_tipo=veiculo_tipo,
                    veiculo_especialidade=veiculo_especialidade,
                    categoria=categoria,
                    status_operacional=status_op,
                    motivo_indisponibilidade=motivo,
                    agendamento_id=agendamento_id,
                    alocacao_id=alocacao_id,
                )
            )

        return MotoristasStatusResponse(
            data=data_ref,
            total=len(resultado),
            disponiveis=contagem["DISPONIVEL"],
            programados=contagem["PROGRAMADO"],
            em_rota=contagem["EM_ROTA"],
            indisponiveis=contagem["INDISPONIVEL"],
            sem_alocacao=contagem["SEM_ALOCACAO"],
            motoristas=resultado,
        )

    @staticmethod
    def alterar_status_motorista(
        db: Session,
        motorista_id: UUID,
        dados: "AlterarStatusMotoristaRequest",
        usuario_id: UUID,
    ) -> "MotoristaStatusResponse":
        from datetime import time
        from app.operacao.schemas import MotoristaStatusResponse
        from app.agendamentos.models import Agendamento, AlocacaoOperacional
        from app.operacao.models import EventoOperacional
        from app.contratos.models import MotoristaDedicadoVinculo
        from app.motoristas.models import Motorista
        from app.veiculos.models import Veiculo
        from app.empresas.models import Empresa

        motorista = db.query(Motorista).filter(Motorista.id == motorista_id).first()
        if not motorista:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Motorista não encontrado.",
            )

        status_permitidos = ["DISPONIVEL", "PROGRAMADO", "EM_ROTA", "INDISPONIVEL", "SEM_ALOCACAO"]
        if dados.novo_status not in status_permitidos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status operacional inválido: {dados.novo_status}.",
            )

        nome_motivo = None
        if dados.novo_status == "INDISPONIVEL":
            if not dados.motivo_indisponibilidade_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="É obrigatório informar o motivo de indisponibilidade.",
                )
            motivo = OperacaoService.buscar_motivo_por_id(db, dados.motivo_indisponibilidade_id)
            nome_motivo = motivo.nome

        # Busca alocação existente para o motorista na data
        alocacao = (
            db.query(AlocacaoOperacional)
            .join(Agendamento, AlocacaoOperacional.agendamento_id == Agendamento.id)
            .filter(
                AlocacaoOperacional.motorista_id == motorista_id,
                Agendamento.data == dados.data,
                Agendamento.status != "CANCELADO",
            )
            .order_by(AlocacaoOperacional.criado_em.desc())
            .first()
        )

        vinculo = (
            db.query(MotoristaDedicadoVinculo)
            .filter(
                MotoristaDedicadoVinculo.motorista_id == motorista_id,
                MotoristaDedicadoVinculo.ativo == True,
            )
            .first()
        )

        # Determina se o motorista pertence à categoria SPOT (sem empresa vinculada)
        categoria_efetiva = (
            alocacao.categoria if alocacao
            else (vinculo.categoria_operacional if vinculo else "SPOT")
        )
        tem_empresa_dedicada = bool(vinculo and vinculo.empresa_id)
        is_spot = (categoria_efetiva == "SPOT") or (not tem_empresa_dedicada)

        if is_spot and dados.novo_status in ("PROGRAMADO", "EM_ROTA"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Motoristas da categoria SPOT não possuem vínculo com empresa e não podem ser alterados para 'Programado' ou 'Em Rota' diretamente nesta tela. Para programá-los, realize o agendamento através da tela de Agendamentos vinculando-os à empresa contratante.",
            )

        if alocacao:
            status_anterior = alocacao.status_operacional
            if dados.novo_status == "SEM_ALOCACAO" or (is_spot and dados.novo_status == "DISPONIVEL"):
                # Libera o motorista SPOT da alocação da empresa contratante e registra o status geral
                from app.operacao.models import StatusOperacionalMotorista
                s_diario = (
                    db.query(StatusOperacionalMotorista)
                    .filter(
                        StatusOperacionalMotorista.motorista_id == motorista_id,
                        StatusOperacionalMotorista.data == dados.data,
                    )
                    .first()
                )
                if not s_diario:
                    s_diario = StatusOperacionalMotorista(
                        motorista_id=motorista_id,
                        data=dados.data,
                        status_operacional=dados.novo_status,
                    )
                    db.add(s_diario)
                else:
                    s_diario.status_operacional = dados.novo_status
                    s_diario.motivo_indisponibilidade_id = None

                evento = EventoOperacional(
                    empresa_id=alocacao.agendamento.empresa_id if alocacao.agendamento else None,
                    motorista_id=alocacao.motorista_id,
                    veiculo_id=alocacao.veiculo_id,
                    agendamento_id=alocacao.agendamento_id,
                    categoria=alocacao.categoria,
                    status_anterior=status_anterior,
                    novo_status=dados.novo_status,
                    motivo_indisponibilidade=None,
                    usuario_id=usuario_id,
                    origem_alteracao=dados.origem_alteracao or "status_motoristas",
                )
                db.add(evento)
                db.delete(alocacao)
                db.commit()

                # Retorna dados atualizados
                emp_nome = None
                if vinculo and vinculo.empresa_id:
                    emp = db.query(Empresa).filter(Empresa.id == vinculo.empresa_id).first()
                    emp_nome = emp.nome if emp else None
                placa = None
                v_tipo = None
                v_esp = None
                if vinculo and vinculo.veiculo_id:
                    vec = db.query(Veiculo).filter(Veiculo.id == vinculo.veiculo_id).first()
                    if vec:
                        placa = vec.placa
                        v_tipo = vec.tipo_veiculo
                        v_esp = vec.especialidade

                return MotoristaStatusResponse(
                    motorista_id=motorista.id,
                    motorista_nome=motorista.nome,
                    empresa_id=vinculo.empresa_id if vinculo else None,
                    empresa_nome=emp_nome,
                    veiculo_id=vinculo.veiculo_id if vinculo else None,
                    veiculo_placa=placa,
                    veiculo_tipo=v_tipo,
                    veiculo_especialidade=v_esp,
                    categoria=vinculo.categoria_operacional if vinculo else "SPOT",
                    status_operacional=dados.novo_status,
                    motivo_indisponibilidade=None,
                    agendamento_id=None,
                    alocacao_id=None,
                )
            else:
                alocacao.status_operacional = dados.novo_status
                alocacao.motivo_indisponibilidade_id = (
                    dados.motivo_indisponibilidade_id if dados.novo_status == "INDISPONIVEL" else None
                )

                evento = EventoOperacional(
                    empresa_id=alocacao.agendamento.empresa_id,
                    motorista_id=alocacao.motorista_id,
                    veiculo_id=alocacao.veiculo_id,
                    agendamento_id=alocacao.agendamento_id,
                    categoria=alocacao.categoria,
                    status_anterior=status_anterior,
                    novo_status=dados.novo_status,
                    motivo_indisponibilidade=nome_motivo,
                    usuario_id=usuario_id,
                    origem_alteracao=dados.origem_alteracao or "status_motoristas",
                )
                db.add(evento)
                db.commit()
                db.refresh(alocacao)

                ret_emp_id = None if (is_spot and not tem_empresa_dedicada) else alocacao.agendamento.empresa_id
                ret_emp_nome = (
                    None
                    if (is_spot and not tem_empresa_dedicada)
                    else (alocacao.agendamento.empresa.nome if alocacao.agendamento.empresa else None)
                )

                return MotoristaStatusResponse(
                    motorista_id=motorista.id,
                    motorista_nome=motorista.nome,
                    empresa_id=ret_emp_id,
                    empresa_nome=ret_emp_nome,
                    veiculo_id=alocacao.veiculo_id,
                    veiculo_placa=alocacao.veiculo.placa if alocacao.veiculo else None,
                    veiculo_tipo=alocacao.veiculo.tipo_veiculo if alocacao.veiculo else None,
                    veiculo_especialidade=alocacao.veiculo.especialidade if alocacao.veiculo else None,
                    categoria=alocacao.categoria,
                    status_operacional=alocacao.status_operacional,
                    motivo_indisponibilidade=nome_motivo,
                    agendamento_id=alocacao.agendamento_id,
                    alocacao_id=alocacao.id,
                )
        else:
            # Motorista não tem alocação num agendamento na data
            # Se for DEDICADO com empresa vinculada e for colocado em PROGRAMADO ou EM_ROTA, cria a alocação no agendamento da empresa
            if vinculo and vinculo.empresa_id and dados.novo_status in ("PROGRAMADO", "EM_ROTA"):
                agendamento = (
                    db.query(Agendamento)
                    .filter(
                        Agendamento.empresa_id == vinculo.empresa_id,
                        Agendamento.data == dados.data,
                        Agendamento.status != "CANCELADO",
                    )
                    .first()
                )
                if not agendamento:
                    agendamento = Agendamento(
                        empresa_id=vinculo.empresa_id,
                        data=dados.data,
                        horario_inicio=time(8, 0),
                        status="PROGRAMADO",
                        versao=0,
                        criado_por_id=usuario_id,
                    )
                    db.add(agendamento)
                    db.flush()

                nova_alocacao = AlocacaoOperacional(
                    agendamento_id=agendamento.id,
                    motorista_id=motorista.id,
                    veiculo_id=vinculo.veiculo_id,
                    categoria=vinculo.categoria_operacional,
                    status_operacional=dados.novo_status,
                )
                db.add(nova_alocacao)
                db.flush()

                evento = EventoOperacional(
                    empresa_id=vinculo.empresa_id,
                    motorista_id=motorista.id,
                    veiculo_id=vinculo.veiculo_id,
                    agendamento_id=agendamento.id,
                    categoria=vinculo.categoria_operacional,
                    status_anterior="SEM_ALOCACAO",
                    novo_status=dados.novo_status,
                    motivo_indisponibilidade=None,
                    usuario_id=usuario_id,
                    origem_alteracao=dados.origem_alteracao or "status_motoristas",
                )
                db.add(evento)
                db.commit()
                db.refresh(nova_alocacao)

                emp = db.query(Empresa).filter(Empresa.id == vinculo.empresa_id).first()
                vec = db.query(Veiculo).filter(Veiculo.id == vinculo.veiculo_id).first() if vinculo.veiculo_id else None

                return MotoristaStatusResponse(
                    motorista_id=motorista.id,
                    motorista_nome=motorista.nome,
                    empresa_id=vinculo.empresa_id,
                    empresa_nome=emp.nome if emp else None,
                    veiculo_id=vinculo.veiculo_id,
                    veiculo_placa=vec.placa if vec else None,
                    veiculo_tipo=vec.tipo_veiculo if vec else None,
                    veiculo_especialidade=vec.especialidade if vec else None,
                    categoria=vinculo.categoria_operacional,
                    status_operacional=nova_alocacao.status_operacional,
                    motivo_indisponibilidade=None,
                    agendamento_id=agendamento.id,
                    alocacao_id=nova_alocacao.id,
                )

            # Para os demais casos (motoristas SPOT ou sem vínculo com empresa), grava status em StatusOperacionalMotorista
            from app.operacao.models import StatusOperacionalMotorista
            s_diario = (
                db.query(StatusOperacionalMotorista)
                .filter(
                    StatusOperacionalMotorista.motorista_id == motorista_id,
                    StatusOperacionalMotorista.data == dados.data,
                )
                .first()
            )
            status_anterior = s_diario.status_operacional if s_diario else "DISPONIVEL"
            if not s_diario:
                s_diario = StatusOperacionalMotorista(
                    motorista_id=motorista_id,
                    data=dados.data,
                    status_operacional=dados.novo_status,
                    motivo_indisponibilidade_id=(
                        dados.motivo_indisponibilidade_id if dados.novo_status == "INDISPONIVEL" else None
                    ),
                )
                db.add(s_diario)
            else:
                s_diario.status_operacional = dados.novo_status
                s_diario.motivo_indisponibilidade_id = (
                    dados.motivo_indisponibilidade_id if dados.novo_status == "INDISPONIVEL" else None
                )

            categoria = vinculo.categoria_operacional if vinculo else "SPOT"
            evento = EventoOperacional(
                empresa_id=vinculo.empresa_id if (vinculo and vinculo.empresa_id) else None,
                motorista_id=motorista.id,
                veiculo_id=vinculo.veiculo_id if (vinculo and vinculo.veiculo_id) else None,
                agendamento_id=None,
                categoria=categoria,
                status_anterior=status_anterior,
                novo_status=dados.novo_status,
                motivo_indisponibilidade=nome_motivo,
                usuario_id=usuario_id,
                origem_alteracao=dados.origem_alteracao or "status_motoristas",
            )
            db.add(evento)
            db.commit()
            db.refresh(s_diario)

            emp_nome = None
            if vinculo and vinculo.empresa_id:
                emp = db.query(Empresa).filter(Empresa.id == vinculo.empresa_id).first()
                emp_nome = emp.nome if emp else None
            placa = None
            v_tipo = None
            v_esp = None
            if vinculo and vinculo.veiculo_id:
                vec = db.query(Veiculo).filter(Veiculo.id == vinculo.veiculo_id).first()
                if vec:
                    placa = vec.placa
                    v_tipo = vec.tipo_veiculo
                    v_esp = vec.especialidade

            return MotoristaStatusResponse(
                motorista_id=motorista.id,
                motorista_nome=motorista.nome,
                empresa_id=vinculo.empresa_id if vinculo else None,
                empresa_nome=emp_nome,
                veiculo_id=vinculo.veiculo_id if vinculo else None,
                veiculo_placa=placa,
                veiculo_tipo=v_tipo,
                veiculo_especialidade=v_esp,
                categoria=categoria,
                status_operacional=s_diario.status_operacional,
                motivo_indisponibilidade=nome_motivo,
                agendamento_id=None,
                alocacao_id=None,
            )

    @staticmethod
    def atualizar_status_lote(
        db: Session,
        dados: "StatusOperacionalLoteRequest",
        usuario_id: UUID,
    ) -> "StatusOperacionalLoteResponse":
        from app.operacao.schemas import StatusOperacionalLoteResponse, AlterarStatusMotoristaRequest
        from app.agendamentos.models import Agendamento, AlocacaoOperacional
        from app.operacao.models import EventoOperacional
        from app.contratos.models import MotoristaDedicadoVinculo

        status_permitidos = ["DISPONIVEL", "PROGRAMADO", "EM_ROTA", "INDISPONIVEL", "SEM_ALOCACAO"]
        if dados.novo_status not in status_permitidos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status operacional inválido: {dados.novo_status}.",
            )

        nome_motivo = None
        if dados.novo_status == "INDISPONIVEL":
            if not dados.motivo_indisponibilidade_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="É obrigatório informar o motivo de indisponibilidade.",
                )
            motivo = OperacaoService.buscar_motivo_por_id(db, dados.motivo_indisponibilidade_id)
            nome_motivo = motivo.nome

        atualizados = 0

        # Caso 1: Lote por alocacao_ids
        if dados.alocacao_ids:
            for aloc_id in dados.alocacao_ids:
                aloc = db.query(AlocacaoOperacional).filter(AlocacaoOperacional.id == aloc_id).first()
                if not aloc:
                    continue

                vinculo = (
                    db.query(MotoristaDedicadoVinculo)
                    .filter(
                        MotoristaDedicadoVinculo.motorista_id == aloc.motorista_id,
                        MotoristaDedicadoVinculo.ativo == True,
                    )
                    .first()
                )
                is_spot = (aloc.categoria == "SPOT") or not (vinculo and vinculo.empresa_id)

                if is_spot and dados.novo_status in ("PROGRAMADO", "EM_ROTA"):
                    if not aloc.agendamento_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Motoristas SPOT não podem ter status 'Programado' ou 'Em Rota' sem agendamento.",
                        )

                status_ant = aloc.status_operacional
                if dados.novo_status == "SEM_ALOCACAO" or (is_spot and dados.novo_status == "DISPONIVEL"):
                    from app.operacao.models import StatusOperacionalMotorista
                    data_alvo = aloc.agendamento.data if aloc.agendamento else agora_local().date()
                    s_diario = (
                        db.query(StatusOperacionalMotorista)
                        .filter(
                            StatusOperacionalMotorista.motorista_id == aloc.motorista_id,
                            StatusOperacionalMotorista.data == data_alvo,
                        )
                        .first()
                    )
                    if not s_diario:
                        s_diario = StatusOperacionalMotorista(
                            motorista_id=aloc.motorista_id,
                            data=data_alvo,
                            status_operacional=dados.novo_status,
                        )
                        db.add(s_diario)
                    else:
                        s_diario.status_operacional = dados.novo_status
                        s_diario.motivo_indisponibilidade_id = None

                    evento = EventoOperacional(
                        empresa_id=aloc.agendamento.empresa_id if aloc.agendamento else None,
                        motorista_id=aloc.motorista_id,
                        veiculo_id=aloc.veiculo_id,
                        agendamento_id=aloc.agendamento_id,
                        categoria=aloc.categoria,
                        status_anterior=status_ant,
                        novo_status=dados.novo_status,
                        motivo_indisponibilidade=None,
                        usuario_id=usuario_id,
                        origem_alteracao=dados.origem_alteracao or "lote",
                    )
                    db.add(evento)
                    db.delete(aloc)
                    atualizados += 1
                else:
                    aloc.status_operacional = dados.novo_status
                    aloc.motivo_indisponibilidade_id = (
                        dados.motivo_indisponibilidade_id if dados.novo_status == "INDISPONIVEL" else None
                    )
                    evento = EventoOperacional(
                        empresa_id=aloc.agendamento.empresa_id,
                        motorista_id=aloc.motorista_id,
                        veiculo_id=aloc.veiculo_id,
                        agendamento_id=aloc.agendamento_id,
                        categoria=aloc.categoria,
                        status_anterior=status_ant,
                        novo_status=dados.novo_status,
                        motivo_indisponibilidade=nome_motivo,
                        usuario_id=usuario_id,
                        origem_alteracao=dados.origem_alteracao or "lote",
                    )
                    db.add(evento)
                    atualizados += 1

        # Caso 2: Lote por motorista_ids
        elif dados.motorista_ids:
            data_alvo = dados.data or agora_local().date()
            for m_id in dados.motorista_ids:
                req_individual = AlterarStatusMotoristaRequest(
                    data=data_alvo,
                    novo_status=dados.novo_status,
                    motivo_indisponibilidade_id=dados.motivo_indisponibilidade_id,
                    origem_alteracao=dados.origem_alteracao or "lote",
                )
                OperacaoService.alterar_status_motorista(
                    db=db,
                    motorista_id=m_id,
                    dados=req_individual,
                    usuario_id=usuario_id,
                )
                atualizados += 1

        db.commit()

        return StatusOperacionalLoteResponse(
            sucesso=True,
            atualizados=atualizados,
            novo_status=dados.novo_status,
            mensagem=f"Status de {atualizados} recurso(s) atualizado(s) com sucesso para {dados.novo_status}.",
        )

    # --- Histórico de Eventos Operacionais ---
    @staticmethod
    def listar_eventos_operacionais(
        db: Session,
        empresa_id: Optional[UUID] = None,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
        motorista_id: Optional[UUID] = None,
        veiculo_id: Optional[UUID] = None,
        categoria: Optional[str] = None,
        novo_status: Optional[str] = None,
        motivo: Optional[str] = None,
        usuario_id: Optional[UUID] = None,
        motorista_nome: Optional[str] = None,
        placa: Optional[str] = None,
        limite: int = 50,
        offset: int = 0,
    ) -> List[EventoOperacional]:
        query = db.query(EventoOperacional)

        if motorista_nome:
            query = query.join(Motorista, EventoOperacional.motorista_id == Motorista.id).filter(
                Motorista.nome.ilike(f"%{motorista_nome}%")
            )
        if placa:
            query = query.join(Veiculo, EventoOperacional.veiculo_id == Veiculo.id).filter(
                Veiculo.placa.ilike(f"%{placa}%")
            )
        if empresa_id:
            query = query.filter(EventoOperacional.empresa_id == empresa_id)
        if data_inicio:
            query = query.filter(EventoOperacional.criado_em >= inicio_do_dia_utc(data_inicio))
        if data_fim:
            query = query.filter(EventoOperacional.criado_em <= fim_do_dia_utc(data_fim))
        if motorista_id:
            query = query.filter(EventoOperacional.motorista_id == motorista_id)
        if veiculo_id:
            query = query.filter(EventoOperacional.veiculo_id == veiculo_id)
        if categoria:
            query = query.filter(EventoOperacional.categoria == categoria)
        if novo_status:
            query = query.filter(EventoOperacional.novo_status == novo_status)
        if motivo:
            query = query.filter(EventoOperacional.motivo_indisponibilidade == motivo)
        if usuario_id:
            query = query.filter(EventoOperacional.usuario_id == usuario_id)

        return query.order_by(EventoOperacional.criado_em.desc()).offset(offset).limit(limite).all()

    # --- Importação de Planilha Operacional ---
    @staticmethod
    def importar_planilha_operacional(
        db: Session, conteudo_arquivo: bytes, nome_arquivo: str, autor_id: UUID
    ) -> Dict[str, Any]:
        import csv
        import io
        import re
        import zipfile
        import xml.etree.ElementTree as ET
        from app.contratos.models import MotoristaDedicadoVinculo

        linhas_brutas = []

        if nome_arquivo.lower().endswith(".csv"):
            texto = conteudo_arquivo.decode("utf-8-sig", errors="ignore")
            reader = csv.reader(io.StringIO(texto), delimiter=",")
            for row in reader:
                if not any(row):
                    continue
                if len(row) == 1 and ";" in row[0]:
                    row = row[0].split(";")
                linhas_brutas.append([col.strip() for col in row])
        else:
            try:
                z = zipfile.ZipFile(io.BytesIO(conteudo_arquivo))
                shared_strings = []
                if "xl/sharedStrings.xml" in z.namelist():
                    tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                    for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                        t = si.find(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                        shared_strings.append(t.text if t is not None else "")

                sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
                rows = sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")
                for r in rows:
                    row_vals = []
                    for c in r.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                        t = c.get("t")
                        v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                        val = v.text if v is not None else ""
                        if t == "s" and val != "":
                            val_idx = int(val)
                            val = shared_strings[val_idx] if val_idx < len(shared_strings) else val
                        row_vals.append(val.strip())
                    if any(row_vals):
                        linhas_brutas.append(row_vals)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erro ao processar arquivo Excel (.xlsx): {str(e)}"
                )

        if not linhas_brutas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A planilha enviada não contém dados."
            )

        header = [str(col).strip().upper() for col in linhas_brutas[0]]

        def buscar_indice(sub_nomes: List[str]) -> int:
            for idx, col in enumerate(header):
                for sub in sub_nomes:
                    if sub.upper() in col:
                        return idx
            return -1

        idx_placa = buscar_indice(["PLACA"])
        idx_ident = buscar_indice(["IDENTIFICAÇÃO", "IDENTIFICACAO", "PREFIXO"])
        idx_tipo = buscar_indice(["TIPO"])
        idx_especialidade = buscar_indice(["ESPECIALIDADE"])
        idx_motorista = buscar_indice(["MOTORISTA"])
        idx_categoria = buscar_indice(["CATEGORIA"])
        idx_empresa = buscar_indice(["EMPRESA"])
        idx_status = buscar_indice(["STATUS"])

        if idx_placa == -1 or idx_motorista == -1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A planilha precisa conter pelo menos as colunas 'Placa' e 'Motorista'."
            )

        total_linhas = len(linhas_brutas) - 1
        criados_veiculos = 0
        criados_motoristas = 0
        criadas_empresas = 0
        vinculos_dedicados_criados = 0
        ignorados_placa_existente = 0
        itens_ignorados = []

        placas_existentes_db = {v.placa for v in db.query(Veiculo.placa).all()}
        placas_processadas = set()

        for line_num, row in enumerate(linhas_brutas[1:], start=2):
            def get_val(idx: int) -> str:
                return row[idx].strip() if 0 <= idx < len(row) and row[idx] else ""

            raw_placa = get_val(idx_placa)
            placa = re.sub(r"[^A-Z0-9]", "", raw_placa.upper())
            motorista_nome = get_val(idx_motorista)

            if not placa:
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": raw_placa or "-",
                    "motorista": motorista_nome or "-",
                    "motivo": "Linha ignorada: campo de placa em branco."
                })
                continue

            if len(placa) < 7:
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": raw_placa,
                    "motorista": motorista_nome or "-",
                    "motivo": f"Placa '{raw_placa}' inválida (menos de 7 caracteres)."
                })
                continue

            if placa in placas_existentes_db or placa in placas_processadas:
                ignorados_placa_existente += 1
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": placa,
                    "motorista": motorista_nome or "-",
                    "motivo": "Placa já cadastrada no sistema (ignorada conforme regra)."
                })
                continue

            if not motorista_nome:
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": placa,
                    "motorista": "-",
                    "motivo": "Nome do motorista em branco."
                })
                continue

            status_text = get_val(idx_status).upper()
            ativo = "INDISPONÍVEL" not in status_text and "INDISPONIVEL" not in status_text

            identificacao = get_val(idx_ident) or placa
            tipo_veiculo = get_val(idx_tipo) or "OUTRO"
            especialidade_raw = get_val(idx_especialidade).upper()
            especialidade = "REFRIGERADO" if "REFRIGERADO" in especialidade_raw else "SECO"

            # 1. Veículo
            veiculo = Veiculo(
                identificacao=identificacao,
                placa=placa,
                tipo_veiculo=tipo_veiculo,
                especialidade=especialidade,
                ativo=ativo,
            )
            db.add(veiculo)
            db.flush()
            criados_veiculos += 1
            placas_processadas.add(placa)

            # 2. Motorista
            motorista = Motorista(
                nome=motorista_nome,
                ativo=ativo,
            )
            db.add(motorista)
            db.flush()
            criados_motoristas += 1

            # 3. Empresa (Cria automaticamente se não existir - Regra A1)
            empresa_nome = get_val(idx_empresa)
            empresa_id = None
            if empresa_nome:
                empresa = db.query(Empresa).filter(Empresa.nome.ilike(empresa_nome)).first()
                if not empresa:
                    slug_ident = re.sub(r"[^A-Z0-9]", "", empresa_nome.upper())[:18] or f"EMP-{placa}"
                    # Evita colisão de identificação
                    if db.query(Empresa).filter(Empresa.identificacao == slug_ident).first():
                        slug_ident = f"EMP-{placa}"[:18]
                    empresa = Empresa(
                        nome=empresa_nome,
                        identificacao=slug_ident,
                        ativo=True,
                    )
                    db.add(empresa)
                    db.flush()
                    criadas_empresas += 1
                empresa_id = empresa.id

            if not empresa_id:
                empresa_padrao = db.query(Empresa).first()
                if empresa_padrao:
                    empresa_id = empresa_padrao.id

            # 4. Vínculo entre Motorista e Veículo (Exigência: Motorista e Veículo permanecem vinculados)
            categoria_raw = get_val(idx_categoria).upper()
            categoria_op = "DEDICADO" if "DEDICADO" in categoria_raw else "SPOT"
            vinculo_empresa_id = empresa_id if categoria_op == "DEDICADO" else None

            vinculo = MotoristaDedicadoVinculo(
                empresa_id=vinculo_empresa_id,
                motorista_id=motorista.id,
                veiculo_id=veiculo.id,
                tipo_veiculo=tipo_veiculo,
                categoria_operacional=categoria_op,
                ativo=ativo,
            )
            db.add(vinculo)
            vinculos_dedicados_criados += 1

        db.commit()

        return {
            "total_linhas": total_linhas,
            "criados_veiculos": criados_veiculos,
            "criados_motoristas": criados_motoristas,
            "criadas_empresas": criadas_empresas,
            "vinculos_dedicados_criados": vinculos_dedicados_criados,
            "ignorados_placa_existente": ignorados_placa_existente,
            "itens_ignorados": itens_ignorados,
        }
