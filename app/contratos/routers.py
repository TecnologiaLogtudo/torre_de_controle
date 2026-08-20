from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.auth.services import obter_usuario_atual
from app.usuarios.models import Usuario
from app.contratos.schemas import (
    ContratoConfiguracaoCreate,
    ContratoConfiguracaoResponse,
    MotoristaDedicadoVinculoCreate,
    MotoristaDedicadoVinculoResponse,
)
from app.contratos.services import (
    criar_contrato_configuracao,
    obter_configuracao_vigente,
    listar_historico_contratos,
    criar_vinculo_motorista,
    obter_vinculo_motorista_por_id,
    desativar_vinculo_motorista,
    listar_vinculos_ativos,
)

router = APIRouter()

# ==========================================
# Rotas de Configurações / Contratos
# ==========================================


@router.post(
    "/empresas/{empresa_id}/configuracoes",
    response_model=ContratoConfiguracaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Definir Configuração de Capacidade Contratual",
)
def cadastrar_contrato_configuracao(
    empresa_id: UUID,
    dados: ContratoConfiguracaoCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """
    Define uma nova configuração de capacidade contratada para veículos dedicados.
    Fecha automaticamente o período contratual anterior e valida a consistência de data.
    """
    try:
        return criar_contrato_configuracao(
            db, empresa_id, dados, autor_id=usuario_atual.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/empresas/{empresa_id}/configuracoes",
    response_model=List[ContratoConfiguracaoResponse],
    summary="Listar Histórico de Configurações Contratuais da Empresa",
)
@router.get(
    "/contratos/empresas/{empresa_id}/configuracoes",
    response_model=List[ContratoConfiguracaoResponse],
    summary="Listar Histórico de Configurações Contratuais da Empresa (Alias)",
)
def obter_historico_configuracoes(
    empresa_id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Retorna o histórico completo das configurações contratuais da empresa, do mais recente para o mais antigo."""
    return listar_historico_contratos(db, empresa_id)


@router.get(
    "/empresas/{empresa_id}/configuracoes/vigente",
    response_model=ContratoConfiguracaoResponse,
    summary="Obter Configuração de Capacidade Vigente",
)
def obter_capacidade_vigente(
    empresa_id: UUID,
    data: Optional[datetime] = Query(
        None,
        description="Data de referência para pesquisa. Se omitido, usa o instante atual.",
    ),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Retorna a configuração de capacidade contratual ativa na data informada."""
    config = obter_configuracao_vigente(db, empresa_id, data)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma configuração de capacidade encontrada para o período informado.",
        )
    return config


# ==========================================
# Rotas de Vínculos de Motoristas Dedicados
# ==========================================


@router.post(
    "/motoristas/dedicados/vinculos",
    response_model=MotoristaDedicadoVinculoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vincular Motorista Dedicado",
)
def cadastrar_vinculo_motorista(
    dados: MotoristaDedicadoVinculoCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Associa um motorista e veículo a uma empresa contratante como dedicado/spot."""
    try:
        return criar_vinculo_motorista(db, dados, autor_id=usuario_atual.id)
    except (ValueError, IntegrityError) as e:
        detail_msg = str(e)
        if isinstance(e, IntegrityError):
            detail_msg = "Já existe um vínculo ativo exclusivo para este motorista ou veículo com outra empresa."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail_msg,
        )


@router.get(
    "/motoristas/dedicados/vinculos",
    response_model=List[MotoristaDedicadoVinculoResponse],
    summary="Listar Vínculos Ativos de Motoristas",
)
def obter_vinculos_ativos(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
    limite: int = 50,
    offset: int = 0,
):
    """Lista todos os vínculos ativos de motoristas dedicados."""
    return listar_vinculos_ativos(db, limite=limite, offset=offset)


@router.post(
    "/motoristas/dedicados/vinculos/{id}/desativar",
    response_model=MotoristaDedicadoVinculoResponse,
    summary="Desativar Vínculo de Motorista Dedicado",
)
def inativar_vinculo_motorista(
    id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Desativa um vínculo ativo de motorista dedicado."""
    vinculo = obter_vinculo_motorista_por_id(db, id)
    if not vinculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vínculo não encontrado.",
        )
    if not vinculo.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este vínculo já se encontra inativo.",
        )
    return desativar_vinculo_motorista(db, vinculo, autor_id=usuario_atual.id)
