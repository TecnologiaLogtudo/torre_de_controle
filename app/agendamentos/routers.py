from typing import List, Optional, Union
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.services import obter_usuario_atual
from app.usuarios.models import Usuario
from app.agendamentos.schemas import (
    AgendamentoCreate,
    AgendamentoUpdate,
    AgendamentoResponse,
    AgendamentoPaginadoResponse,
    AlocacaoOperacionalCreate,
    AlocacaoOperacionalResponse,
    StatusOperacionalUpdate,
    HistoricoAgendamentoResponse,
)
from app.agendamentos.services import AgendamentoService

router = APIRouter(prefix="/agendamentos", tags=["Agendamentos & Alocações Operacionais"])

@router.post(
    "",
    response_model=AgendamentoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo agendamento (com preenchimento automático de dedicados)",
)
def criar_agendamento(
    dados: AgendamentoCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.criar_agendamento(db, dados, usuario_atual.id)


@router.get(
    "",
    response_model=Union[AgendamentoPaginadoResponse, List[AgendamentoResponse]],
    summary="Listar agendamentos com filtros e paginação",
)
def listar_agendamentos(
    empresa_id: Optional[UUID] = Query(None),
    data: Optional[date] = Query(None),
    status_filtro: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100, alias="limite"),
    offset: int = Query(0, ge=0),
    paginado: bool = Query(False, description="Se True, retorna no formato {items, total, limite, offset}"),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    items = AgendamentoService.listar(
        db, empresa_id=empresa_id, data=data, status_filtro=status_filtro, limite=limit, offset=offset
    )
    if paginado:
        total = AgendamentoService.contar_total(
            db, empresa_id=empresa_id, data=data, status_filtro=status_filtro
        )
        return {"items": items, "total": total, "limite": limit, "offset": offset}
    return items


@router.get(
    "/{agendamento_id}",
    response_model=AgendamentoResponse,
    summary="Obter agendamento por ID",
)
def obter_agendamento(
    agendamento_id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.buscar_por_id(db, agendamento_id)


@router.get(
    "/{agendamento_id}/historico",
    response_model=List[HistoricoAgendamentoResponse],
    summary="Consultar histórico de alterações do agendamento",
)
def obter_historico_agendamento(
    agendamento_id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.obter_historico_agendamento(db, agendamento_id)


@router.put(
    "/{agendamento_id}",
    response_model=AgendamentoResponse,
    summary="Atualizar agendamento",
)
def atualizar_agendamento(
    agendamento_id: UUID,
    dados: AgendamentoUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.atualizar_agendamento(db, agendamento_id, dados, usuario_atual.id)


@router.post(
    "/{agendamento_id}/cancelar",
    response_model=AgendamentoResponse,
    summary="Cancelar agendamento",
)
def cancelar_agendamento(
    agendamento_id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.cancelar_agendamento(db, agendamento_id, usuario_atual.id)


# --- Alocações SPOT ---

@router.post(
    "/{agendamento_id}/spots",
    response_model=AlocacaoOperacionalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar alocação SPOT a um agendamento",
)
def adicionar_spot(
    agendamento_id: UUID,
    dados: AlocacaoOperacionalCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.adicionar_spot(db, agendamento_id, dados, usuario_atual.id)


@router.post(
    "/alocacoes/{alocacao_id}/substituir",
    response_model=AlocacaoOperacionalResponse,
    summary="Substituir alocação SPOT por novo motorista/veículo (com lock pessimista)",
)
def substituir_spot(
    alocacao_id: UUID,
    dados: AlocacaoOperacionalCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.substituir_spot(db, alocacao_id, dados, usuario_atual.id)


@router.delete(
    "/alocacoes/{alocacao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover alocação SPOT de um agendamento",
)
def remover_spot(
    alocacao_id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    AgendamentoService.remover_spot(db, alocacao_id, usuario_atual.id)


# --- Transições de Status Operacional ---

@router.put(
    "/alocacoes/{alocacao_id}/status",
    response_model=AlocacaoOperacionalResponse,
    summary="Atualizar status operacional de motorista/veículo (gera evento imutável)",
)
def atualizar_status_operacional(
    alocacao_id: UUID,
    dados: StatusOperacionalUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return AgendamentoService.atualizar_status_operacional(
        db=db,
        alocacao_id=alocacao_id,
        novo_status=dados.novo_status,
        motivo_indisponibilidade_id=dados.motivo_indisponibilidade_id,
        origem=dados.origem_alteracao,
        usuario_id=usuario_atual.id,
    )
