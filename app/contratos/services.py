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

    # Cria a nova configuração
    nova_config = ContratoConfiguracao(
        empresa_id=empresa_id,
        data_inicio=nova_data_inicio_utc,
        data_fim=None,
        regras=dados.regras,
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
    """Retorna o vínculo ativo (se houver) de um motorista específico."""
    return (
        db.query(MotoristaDedicadoVinculo)
        .filter(
            MotoristaDedicadoVinculo.motorista_id == motorista_id,
            MotoristaDedicadoVinculo.ativo == True,
        )
        .first()
    )


def listar_vinculos_ativos(
    db: Session, limite: int = 50, offset: int = 0
) -> List[MotoristaDedicadoVinculo]:
    return (
        db.query(MotoristaDedicadoVinculo)
        .filter(MotoristaDedicadoVinculo.ativo == True)
        .offset(offset)
        .limit(limite)
        .all()
    )


def criar_vinculo_motorista(
    db: Session, dados: MotoristaDedicadoVinculoCreate, autor_id: uuid.UUID
) -> MotoristaDedicadoVinculo:
    """Cria um vínculo de motorista dedicado, garantindo a exclusividade de vínculo ativo."""
    # Valida existência de empresa e motorista
    empresa = db.query(Empresa).filter(Empresa.id == dados.empresa_id).first()
    if not empresa:
        raise ValueError("A empresa informada não existe.")

    motorista = (
        db.query(Motorista).filter(Motorista.id == dados.motorista_id).first()
    )
    if not motorista:
        raise ValueError("O motorista informado não existe.")

    # Valida se o motorista já está vinculado de forma ativa em qualquer empresa
    vinculo_existente = obter_vinculo_ativo_motorista(db, dados.motorista_id)
    if vinculo_existente:
        raise ValueError(
            "Este motorista já possui um vínculo ativo com outra empresa no momento."
        )

    # Valida se o veículo já está vinculado de forma ativa em qualquer empresa
    if dados.veiculo_id:
        vinculo_veiculo = (
            db.query(MotoristaDedicadoVinculo)
            .filter(
                MotoristaDedicadoVinculo.veiculo_id == dados.veiculo_id,
                MotoristaDedicadoVinculo.ativo == True,
            )
            .first()
        )
        if vinculo_veiculo:
            raise ValueError(
                "Este veículo já possui um vínculo dedicado ativo com outra empresa no momento."
            )

    vinculo = MotoristaDedicadoVinculo(
        empresa_id=dados.empresa_id,
        motorista_id=dados.motorista_id,
        veiculo_id=dados.veiculo_id,
        tipo_veiculo=dados.tipo_veiculo,
        categoria_operacional=dados.categoria_operacional,
        ativo=True,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(vinculo)

    estado_posterior = {
        "id": str(vinculo.id),
        "empresa_id": str(vinculo.empresa_id),
        "motorista_id": str(vinculo.motorista_id),
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
    """Inativa o vínculo do motorista dedicado, liberando-o para novos contratos."""
    estado_anterior = {
        "id": str(vinculo.id),
        "empresa_id": str(vinculo.empresa_id),
        "motorista_id": str(vinculo.motorista_id),
        "tipo_veiculo": vinculo.tipo_veiculo,
        "categoria_operacional": vinculo.categoria_operacional,
        "ativo": vinculo.ativo,
    }

    vinculo.ativo = False
    db.commit()
    db.refresh(vinculo)

    estado_posterior = {
        "id": str(vinculo.id),
        "empresa_id": str(vinculo.empresa_id),
        "motorista_id": str(vinculo.motorista_id),
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
