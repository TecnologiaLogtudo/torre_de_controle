from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.services import obter_usuario_atual
from app.usuarios.models import Usuario
from app.operacao.schemas import (
    MotivoIndisponibilidadeCreate,
    MotivoIndisponibilidadeUpdate,
    MotivoIndisponibilidadeResponse,
    ConfiguracaoSistemaResponse,
    ConfiguracaoSistemaUpdate,
    ResumoTorreResponse,
    ResumoEmpresaTorreResponse,
    DetalhamentoOperacionalResponse,
    EventoOperacionalResponse,
)
from app.operacao.services import OperacaoService

router = APIRouter(prefix="/operacao", tags=["Operação, Torre de Controle & Configurações"])

# --- Endpoints de Motivos de Indisponibilidade ---

@router.get(
    "/motivos-indisponibilidade",
    response_model=List[MotivoIndisponibilidadeResponse],
    summary="Listar motivos de indisponibilidade",
)
def listar_motivos(
    apenas_ativos: bool = False,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.listar_motivos(db, apenas_ativos=apenas_ativos)


@router.post(
    "/motivos-indisponibilidade",
    response_model=MotivoIndisponibilidadeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo motivo de indisponibilidade",
)
def criar_motivo(
    dados: MotivoIndisponibilidadeCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.criar_motivo(db, dados)


@router.put(
    "/motivos-indisponibilidade/{motivo_id}",
    response_model=MotivoIndisponibilidadeResponse,
    summary="Atualizar motivo de indisponibilidade",
)
def atualizar_motivo(
    motivo_id: UUID,
    dados: MotivoIndisponibilidadeUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.atualizar_motivo(db, motivo_id, dados)


# --- Endpoints de Configurações do Sistema ---

@router.get(
    "/configuracoes",
    response_model=List[ConfiguracaoSistemaResponse],
    summary="Listar configurações do sistema",
)
def listar_configuracoes(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.listar_configuracoes(db)


@router.get(
    "/configuracoes/{chave}",
    response_model=ConfiguracaoSistemaResponse,
    summary="Obter configuração específica por chave",
)
def obter_configuracao(
    chave: str,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.obter_configuracao_objeto(db, chave)


@router.put(
    "/configuracoes/{chave}",
    response_model=ConfiguracaoSistemaResponse,
    summary="Atualizar configuração do sistema",
)
def atualizar_configuracao(
    chave: str,
    dados: ConfiguracaoSistemaUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.atualizar_configuracao(db, chave, dados.valor)


# --- Painel da Torre de Controle (Read Model) ---

@router.get(
    "/torre/resumo",
    response_model=ResumoTorreResponse,
    summary="Obter resumo geral da Torre de Controle",
)
def obter_resumo_geral(
    data: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.obter_resumo_geral(db, data_filtro=data)


@router.get(
    "/torre/empresas-resumo",
    response_model=List[ResumoEmpresaTorreResponse],
    summary="Obter resumo operacional por empresa",
)
def obter_resumo_por_empresa(
    data: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.obter_resumo_por_empresa(db, data_filtro=data)


@router.get(
    "/torre/detalhamento",
    response_model=List[DetalhamentoOperacionalResponse],
    summary="Obter detalhamento operacional (painel da Torre com filtros)",
)
def obter_detalhamento_operacional(
    data: Optional[date] = Query(None),
    empresa_id: Optional[UUID] = Query(None),
    status_filtro: Optional[str] = Query(None, alias="status"),
    categoria: Optional[str] = Query(None),
    tipo_veiculo: Optional[str] = Query(None),
    especialidade: Optional[str] = Query(None),
    placa: Optional[str] = Query(None),
    motorista_nome: Optional[str] = Query(None),
    motorista_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=100, alias="limite"),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.obter_detalhamento_operacional(
        db=db,
        data_filtro=data,
        empresa_id=empresa_id,
        status_filtro=status_filtro,
        categoria=categoria,
        tipo_veiculo=tipo_veiculo,
        especialidade=especialidade,
        placa=placa,
        motorista_nome=motorista_nome,
        motorista_id=motorista_id,
        limite=limit,
        offset=offset,
    )


# --- Histórico de Eventos Operacionais ---

@router.get(
    "/historico-eventos",
    response_model=List[EventoOperacionalResponse],
    summary="Consultar histórico de eventos operacionais imutáveis",
)
def listar_eventos_operacionais(
    empresa_id: Optional[UUID] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    motorista_id: Optional[UUID] = Query(None),
    veiculo_id: Optional[UUID] = Query(None),
    categoria: Optional[str] = Query(None),
    novo_status: Optional[str] = Query(None),
    motivo: Optional[str] = Query(None),
    usuario_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=100, alias="limite"),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    return OperacaoService.listar_eventos_operacionais(
        db=db,
        empresa_id=empresa_id,
        data_inicio=data_inicio,
        data_fim=data_fim,
        motorista_id=motorista_id,
        veiculo_id=veiculo_id,
        categoria=categoria,
        novo_status=novo_status,
        motivo=motivo,
        usuario_id=usuario_id,
        limite=limit,
        offset=offset,
    )
