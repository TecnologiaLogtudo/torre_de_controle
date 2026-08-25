from typing import Optional, List
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.contratos.models import ContratoConfiguracao, MotoristaDedicadoVinculo
from app.contratos.schemas import (
    ContratoConfiguracaoCreate,
    MotoristaDedicadoVinculoCreate,
)
from app.core.datetime_utils import para_utc, agora_local
from app.auditoria.services import registrar_auditoria
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo


# ==========================================
# Serviços de Contratos / Configurações
# ==========================================


def obter_contrato_configuracao_por_id(
    db: Session, config_id: uuid.UUID
) -> Optional[ContratoConfiguracao]:
    return (
        db.query(ContratoConfiguracao)
        .filter(ContratoConfiguracao.id == config_id)
        .first()
    )



def obter_configuracao_vigente(
    db: Session, empresa_id: uuid.UUID, data_ref: Optional[datetime] = None
) -> Optional[ContratoConfiguracao]:
    """
    Retorna a configuração contratual de capacidade vigente para uma determinada data.
    Caso data_ref seja nula, assume o instante atual local (convertido para UTC).
    """
    if data_ref is None:
        data_ref_utc = para_utc(agora_local())
    else:
        data_ref_utc = para_utc(data_ref)

    return (
        db.query(ContratoConfiguracao)
        .filter(
            ContratoConfiguracao.empresa_id == empresa_id,
            ContratoConfiguracao.data_inicio <= data_ref_utc,
            (ContratoConfiguracao.data_fim == None)
            | (ContratoConfiguracao.data_fim > data_ref_utc),
        )
        .first()
    )


def listar_historico_contratos(
    db: Session, empresa_id: uuid.UUID
) -> List[ContratoConfiguracao]:
    """Retorna o histórico completo das configurações contratuais da empresa do mais recente para o mais antigo."""
    return (
        db.query(ContratoConfiguracao)
        .filter(ContratoConfiguracao.empresa_id == empresa_id)
        .order_by(ContratoConfiguracao.data_inicio.desc())
        .all()
    )


def criar_contrato_configuracao(
    db: Session,
    empresa_id: uuid.UUID,
    dados: ContratoConfiguracaoCreate,
    autor_id: uuid.UUID,
) -> ContratoConfiguracao:
    """
    Cria uma nova configuração de capacidade com vigência, fechando a vigência anterior
    e validando a integridade cronológica para evitar sobreposição.
    """
    # Converte data_inicio para UTC
    nova_data_inicio_utc = para_utc(dados.data_inicio)

    # Busca a configuração com data de início mais recente para a empresa
    ultima_config = (
        db.query(ContratoConfiguracao)
        .filter(ContratoConfiguracao.empresa_id == empresa_id)
        .order_by(ContratoConfiguracao.data_inicio.desc())
        .first()
    )

    if ultima_config:
        # A nova data de início não pode retroceder além da data de início do último contrato
        if nova_data_inicio_utc < ultima_config.data_inicio:
            raise ValueError(
                "A data de início da nova configuração não pode ser anterior à data de início do contrato mais recente."
            )

        # Se a última vigência estava aberta (data_fim é nula), fecha-a exatamente no início da nova
        if ultima_config.data_fim is None:
            # Salva o estado anterior para auditoria antes de atualizar
            estado_anterior_ultima = {
                "id": str(ultima_config.id),
                "data_inicio": ultima_config.data_inicio.isoformat(),
                "data_fim": None,
                "regras": ultima_config.regras,
            }

            ultima_config.data_fim = nova_data_inicio_utc
            db.commit()

            estado_posterior_ultima = {
                "id": str(ultima_config.id),
                "data_inicio": ultima_config.data_inicio.isoformat(),
                "data_fim": ultima_config.data_fim.isoformat(),
                "regras": ultima_config.regras,
            }

            # Registra auditoria da alteração de data_fim da última configuração
            registrar_auditoria(
                db=db,
                usuario_id=autor_id,
                entidade_afetada="contratos_configuracoes",
                entidade_id=ultima_config.id,
                acao="ATUALIZAR",
                estado_anterior=estado_anterior_ultima,
                estado_posterior=estado_posterior_ultima,
            )
        else:
            # Se a última já estava fechada, a nova não pode conflitar dentro do intervalo fechado
            if nova_data_inicio_utc < ultima_config.data_fim:
                raise ValueError(
                    "A data de início da nova configuração sobrepõe uma vigência fechada existente."
                )

    regras_armazenadas = dados.regras
    if dados.capacidades:
        regras_armazenadas = [
            c.model_dump() if hasattr(c, "model_dump") else dict(c)
            for c in dados.capacidades
        ]

    # Cria a nova configuração
    nova_config = ContratoConfiguracao(
        empresa_id=empresa_id,
        data_inicio=nova_data_inicio_utc,
        data_fim=None,
        regras=regras_armazenadas,
    )
    db.add(nova_config)
    db.commit()
    db.refresh(nova_config)

    # Auditoria da criação
    estado_posterior = {
        "id": str(nova_config.id),
        "empresa_id": str(nova_config.empresa_id),
        "data_inicio": nova_config.data_inicio.isoformat(),
        "data_fim": None,
        "regras": nova_config.regras,
    }
    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="contratos_configuracoes",
        entidade_id=nova_config.id,
        acao="CRIAR",
        estado_anterior=None,
        estado_posterior=estado_posterior,
    )

    return nova_config


# ==========================================
# Serviços de Vínculos de Motoristas
# ==========================================


def obter_vinculo_motorista_por_id(
    db: Session, vinculo_id: uuid.UUID
) -> Optional[MotoristaDedicadoVinculo]:
    return (
        db.query(MotoristaDedicadoVinculo)
        .filter(MotoristaDedicadoVinculo.id == vinculo_id)
        .first()
    )


def obter_vinculo_ativo_motorista(
    db: Session, motorista_id: uuid.UUID
) -> Optional[MotoristaDedicadoVinculo]:
    """Retorna o vínculo ativo (seja dedicado ou spot) de um motorista."""
    return (
        db.query(MotoristaDedicadoVinculo)
        .filter(
            MotoristaDedicadoVinculo.motorista_id == motorista_id,
            MotoristaDedicadoVinculo.ativo == True,
        )
        .first()
    )


def listar_vinculos_ativos(
    db: Session, limite: int = 1000, offset: int = 0
) -> List[MotoristaDedicadoVinculo]:
    """Lista todos os vínculos ativos de motoristas (dedicados e spot)."""
    return (
        db.query(MotoristaDedicadoVinculo)
        .filter(MotoristaDedicadoVinculo.ativo == True)
        .limit(limite)
        .offset(offset)
        .all()
    )


def criar_vinculo_motorista(
    db: Session, dados: MotoristaDedicadoVinculoCreate, autor_id: uuid.UUID
) -> MotoristaDedicadoVinculo:
    """Cria um vínculo de motorista (dedicado ou spot), garantindo a consistência de vínculos ativos e regras de capacidade."""
    # Valida existência de motorista
    motorista = (
        db.query(Motorista).filter(Motorista.id == dados.motorista_id).first()
    )
    if not motorista:
        raise ValueError("O motorista informado não existe.")
    if not motorista.ativo:
        raise ValueError("O motorista informado está inativo no cadastro geral.")

    # Valida existência de veículo se informado
    veiculo_obj = None
    tipo_veiculo = dados.tipo_veiculo
    if dados.veiculo_id:
        veiculo_obj = db.query(Veiculo).filter(Veiculo.id == dados.veiculo_id).first()
        if not veiculo_obj:
            raise ValueError("O veículo informado não existe.")
        if not veiculo_obj.ativo:
            raise ValueError("O veículo informado está inativo no cadastro geral.")
        if not tipo_veiculo:
            tipo_veiculo = veiculo_obj.tipo_veiculo

    if not tipo_veiculo:
        tipo_veiculo = "SPOT" if not dados.empresa_id else "DEDICADO"

    # Se informado com empresa_id, valida regras de capacidade contratual ativa
    if dados.empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == dados.empresa_id).first()
        if not empresa:
            raise ValueError("A empresa informada não existe.")
        if not empresa.ativo:
            raise ValueError("A empresa informada está inativa.")

        # Regra 4: Exigência de Configuração de Capacidade Ativa
        configuracao_vigente = obter_configuracao_vigente(db, dados.empresa_id)
        if not configuracao_vigente or not configuracao_vigente.regras:
            raise ValueError(
                "A empresa selecionada não possui uma configuração de capacidade contratual vigente ativa."
            )

        capacidades_contratadas: List[dict] = []
        regras_data = configuracao_vigente.regras
        if isinstance(regras_data, list):
            for item in regras_data:
                if isinstance(item, dict):
                    capacidades_contratadas.append({
                        "tipo_veiculo": str(item.get("tipo_veiculo", "")).upper(),
                        "especialidade": str(item.get("especialidade") or "SECO").upper(),
                        "quantidade": int(item.get("quantidade", 1)),
                    })
        elif isinstance(regras_data, dict):
            for tipo, qtd in regras_data.items():
                capacidades_contratadas.append({
                    "tipo_veiculo": str(tipo).upper(),
                    "especialidade": "SECO",
                    "quantidade": int(qtd),
                })

        if not capacidades_contratadas:
            raise ValueError(
                "A empresa selecionada não possui uma configuração de capacidade contratual vigente ativa."
            )

        # Regra 5 & 7: Validação do Tipo de Veículo e Especialidade contra a capacidade contratada
        tipos_contratados = {c["tipo_veiculo"] for c in capacidades_contratadas}
        if tipo_veiculo.upper() not in tipos_contratados:
            raise ValueError(
                f"O tipo de veículo '{tipo_veiculo}' não faz parte da configuração de capacidade contratada para esta empresa ({', '.join(sorted(tipos_contratados))})."
            )

        # Especialidade (se o veículo tiver especialidade e a capacidade exigir compatibilidade)
        if veiculo_obj and veiculo_obj.especialidade:
            especialidades_compativeis = {
                c["especialidade"]
                for c in capacidades_contratadas
                if c["tipo_veiculo"] == tipo_veiculo.upper()
            }
            if (
                "SECO" not in especialidades_compativeis
                and veiculo_obj.especialidade.upper() == "SECO"
            ):
                raise ValueError(
                    f"A capacidade contratada para veículos do tipo '{tipo_veiculo}' exige especialidade ({', '.join(sorted(especialidades_compativeis))}), mas o veículo selecionado possui especialidade '{veiculo_obj.especialidade}'."
                )

        # Regra 6: Teto de Vagas por Tipo de Veículo Contratado
        vagas_contratadas = sum(
            c["quantidade"]
            for c in capacidades_contratadas
            if c["tipo_veiculo"] == tipo_veiculo.upper()
        )
        vinculos_ativos_count = (
            db.query(MotoristaDedicadoVinculo)
            .filter(
                MotoristaDedicadoVinculo.empresa_id == dados.empresa_id,
                MotoristaDedicadoVinculo.ativo == True,
                MotoristaDedicadoVinculo.tipo_veiculo == tipo_veiculo,
                MotoristaDedicadoVinculo.motorista_id != dados.motorista_id,
            )
            .count()
        )
        if vinculos_ativos_count >= vagas_contratadas:
            raise ValueError(
                f"A capacidade contratada para veículos do tipo '{tipo_veiculo}' já foi totalmente preenchida ({vinculos_ativos_count}/{vagas_contratadas}). Atualize a configuração contratual antes de vincular novos dedicados."
            )

    # Valida se o motorista já está vinculado de forma ativa
    vinculo_existente = obter_vinculo_ativo_motorista(db, dados.motorista_id)
    if vinculo_existente:
        if vinculo_existente.categoria_operacional == "SPOT" and dados.empresa_id:
            # Transição: Motorista SPOT adicionado a vínculo de empresa muda para DEDICADO
            estado_anterior = {
                "id": str(vinculo_existente.id),
                "empresa_id": str(vinculo_existente.empresa_id) if vinculo_existente.empresa_id else None,
                "motorista_id": str(vinculo_existente.motorista_id),
                "veiculo_id": str(vinculo_existente.veiculo_id) if vinculo_existente.veiculo_id else None,
                "tipo_veiculo": vinculo_existente.tipo_veiculo,
                "categoria_operacional": vinculo_existente.categoria_operacional,
                "ativo": vinculo_existente.ativo,
            }
            vinculo_existente.empresa_id = dados.empresa_id
            if dados.veiculo_id:
                vinculo_existente.veiculo_id = dados.veiculo_id
            if tipo_veiculo:
                vinculo_existente.tipo_veiculo = tipo_veiculo
            vinculo_existente.categoria_operacional = "DEDICADO"
            db.commit()
            db.refresh(vinculo_existente)

            estado_posterior = {
                "id": str(vinculo_existente.id),
                "empresa_id": str(vinculo_existente.empresa_id) if vinculo_existente.empresa_id else None,
                "motorista_id": str(vinculo_existente.motorista_id),
                "veiculo_id": str(vinculo_existente.veiculo_id) if vinculo_existente.veiculo_id else None,
                "tipo_veiculo": vinculo_existente.tipo_veiculo,
                "categoria_operacional": vinculo_existente.categoria_operacional,
                "ativo": vinculo_existente.ativo,
            }
            registrar_auditoria(
                db=db,
                usuario_id=autor_id,
                entidade_afetada="motoristas_dedicados_vinculos",
                entidade_id=vinculo_existente.id,
                acao="ATUALIZAR",
                estado_anterior=estado_anterior,
                estado_posterior=estado_posterior,
            )
            return vinculo_existente
        else:
            raise ValueError(
                "Este motorista já possui um vínculo ativo no momento."
            )

    # Valida se o veículo já está vinculado de forma ativa
    if dados.veiculo_id:
        vinculo_veiculo = (
            db.query(MotoristaDedicadoVinculo)
            .filter(
                MotoristaDedicadoVinculo.veiculo_id == dados.veiculo_id,
                MotoristaDedicadoVinculo.ativo == True,
            )
            .first()
        )
        if vinculo_veiculo and vinculo_veiculo.categoria_operacional == "DEDICADO" and dados.empresa_id:
            raise ValueError(
                "Este veículo já possui um vínculo dedicado ativo com outra empresa no momento."
            )

    # Se informado com empresa_id, torna-se DEDICADO; caso contrário, respeita categoria ou padrão SPOT
    categoria_operacional = "DEDICADO" if dados.empresa_id else (dados.categoria_operacional or "SPOT")

    vinculo = MotoristaDedicadoVinculo(
        empresa_id=dados.empresa_id,
        motorista_id=dados.motorista_id,
        veiculo_id=dados.veiculo_id,
        tipo_veiculo=tipo_veiculo,
        categoria_operacional=categoria_operacional,
        ativo=True,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(vinculo)

    estado_posterior = {
        "id": str(vinculo.id),
        "empresa_id": str(vinculo.empresa_id) if vinculo.empresa_id else None,
        "motorista_id": str(vinculo.motorista_id),
        "veiculo_id": str(vinculo.veiculo_id) if vinculo.veiculo_id else None,
        "tipo_veiculo": vinculo.tipo_veiculo,
        "categoria_operacional": vinculo.categoria_operacional,
        "ativo": vinculo.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="motoristas_dedicados_vinculos",
        entidade_id=vinculo.id,
        acao="CRIAR",
        estado_posterior=estado_posterior,
    )

    return vinculo


def desativar_vinculo_motorista(
    db: Session, vinculo: MotoristaDedicadoVinculo, autor_id: uuid.UUID
) -> MotoristaDedicadoVinculo:
    """Inativa o vínculo do motorista, liberando-o para novos contratos ou alocações."""
    estado_anterior = {
        "id": str(vinculo.id),
        "empresa_id": str(vinculo.empresa_id) if vinculo.empresa_id else None,
        "motorista_id": str(vinculo.motorista_id),
        "veiculo_id": str(vinculo.veiculo_id) if vinculo.veiculo_id else None,
        "tipo_veiculo": vinculo.tipo_veiculo,
        "categoria_operacional": vinculo.categoria_operacional,
        "ativo": vinculo.ativo,
    }

    vinculo.ativo = False
    db.commit()
    db.refresh(vinculo)

    estado_posterior = {
        "id": str(vinculo.id),
        "empresa_id": str(vinculo.empresa_id) if vinculo.empresa_id else None,
        "motorista_id": str(vinculo.motorista_id),
        "veiculo_id": str(vinculo.veiculo_id) if vinculo.veiculo_id else None,
        "tipo_veiculo": vinculo.tipo_veiculo,
        "categoria_operacional": vinculo.categoria_operacional,
        "ativo": vinculo.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="motoristas_dedicados_vinculos",
        entidade_id=vinculo.id,
        acao="ATUALIZAR",
        estado_anterior=estado_anterior,
        estado_posterior=estado_posterior,
    )

    return vinculo
