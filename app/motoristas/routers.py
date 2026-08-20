from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.services import obter_usuario_atual
from app.usuarios.models import Usuario
from app.motoristas.schemas import (
    MotoristaCreate,
    MotoristaUpdate,
    MotoristaResponse,
)
from app.motoristas.services import (
    obter_motorista_por_id,
    listar_motoristas,
    criar_motorista,
    atualizar_motorista,
)

router = APIRouter()


@router.post(
    "",
    response_model=MotoristaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Motorista",
)
def cadastrar_motorista(
    dados: MotoristaCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Cadastra um novo motorista."""
    return criar_motorista(db, dados, autor_id=usuario_atual.id)


@router.get(
    "", response_model=List[MotoristaResponse], summary="Listar Motoristas"
)
def obter_motoristas(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
    limite: int = 50,
    offset: int = 0,
):
    """Lista todos os motoristas cadastrados."""
    return listar_motoristas(db, limite=limite, offset=offset)


@router.get(
    "/{id}",
    response_model=MotoristaResponse,
    summary="Obter Detalhes do Motorista",
)
def obter_motorista(
    id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Busca um motorista pelo seu identificador UUID."""
    motorista = obter_motorista_por_id(db, id)
    if not motorista:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Motorista não encontrado.",
        )
    return motorista


@router.put(
    "/{id}", response_model=MotoristaResponse, summary="Atualizar Motorista"
)
def alterar_motorista(
    id: UUID,
    dados: MotoristaUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Atualiza dados do motorista."""
    motorista = obter_motorista_por_id(db, id)
    if not motorista:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Motorista não encontrado.",
        )
    return atualizar_motorista(db, motorista, dados, autor_id=usuario_atual.id)
