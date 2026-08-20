from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.services import obter_usuario_atual
from app.usuarios.models import Usuario
from app.empresas.schemas import EmpresaCreate, EmpresaUpdate, EmpresaResponse
from app.empresas.services import (
    obter_empresa_por_id,
    obter_empresa_por_identificacao,
    listar_empresas,
    criar_empresa,
    atualizar_empresa,
)

router = APIRouter()


@router.post(
    "",
    response_model=EmpresaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Empresa",
)
def cadastrar_empresa(
    dados: EmpresaCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Cadastra uma nova empresa parceira."""
    if obter_empresa_por_identificacao(db, dados.identificacao):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma empresa cadastrada com esta identificação (CNPJ/CPF).",
        )
    return criar_empresa(db, dados, autor_id=usuario_atual.id)


@router.get(
    "", response_model=List[EmpresaResponse], summary="Listar Empresas"
)
def obter_empresas(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
    limite: int = 50,
    offset: int = 0,
):
    """Lista as empresas cadastradas."""
    return listar_empresas(db, limite=limite, offset=offset)


@router.get(
    "/{id}", response_model=EmpresaResponse, summary="Obter Detalhes da Empresa"
)
def obter_empresa(
    id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Busca uma empresa pelo seu identificador UUID."""
    empresa = obter_empresa_por_id(db, id)
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada.",
        )
    return empresa


@router.put(
    "/{id}", response_model=EmpresaResponse, summary="Atualizar Empresa"
)
def alterar_empresa(
    id: UUID,
    dados: EmpresaUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Atualiza os dados de uma empresa existente."""
    empresa = obter_empresa_por_id(db, id)
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada.",
        )
    return atualizar_empresa(db, empresa, dados, autor_id=usuario_atual.id)
