from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.services import obter_usuario_atual
from app.usuarios.models import Usuario
from app.veiculos.schemas import VeiculoCreate, VeiculoUpdate, VeiculoResponse
from app.veiculos.services import (
    obter_veiculo_por_id,
    obter_veiculo_por_placa,
    obter_veiculo_por_identificacao,
    listar_veiculos,
    criar_veiculo,
    atualizar_veiculo,
)

router = APIRouter()


@router.post(
    "",
    response_model=VeiculoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Veículo",
)
def cadastrar_veiculo(
    dados: VeiculoCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Cadastra um novo veículo."""
    # Valida placa duplicada
    if obter_veiculo_por_placa(db, dados.placa):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um veículo cadastrado com esta placa.",
        )
    # Valida identificação duplicada
    if obter_veiculo_por_identificacao(db, dados.identificacao):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um veículo cadastrado com esta identificação.",
        )
    return criar_veiculo(db, dados, autor_id=usuario_atual.id)


@router.get(
    "", response_model=List[VeiculoResponse], summary="Listar Veículos"
)
def obter_veiculos(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
    limite: int = 50,
    offset: int = 0,
):
    """Lista todos os veículos cadastrados."""
    return listar_veiculos(db, limite=limite, offset=offset)


@router.get(
    "/{id}", response_model=VeiculoResponse, summary="Obter Detalhes do Veículo"
)
def obter_veiculo(
    id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Busca um veículo pelo seu identificador UUID."""
    veiculo = obter_veiculo_por_id(db, id)
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado.",
        )
    return veiculo


@router.put(
    "/{id}", response_model=VeiculoResponse, summary="Atualizar Veículo"
)
def alterar_veiculo(
    id: UUID,
    dados: VeiculoUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Atualiza dados do veículo."""
    veiculo = obter_veiculo_por_id(db, id)
    if not veiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Veículo não encontrado.",
        )

    # Verifica se placa ou identificacao pertencem a outro veículo
    veiculo_placa = obter_veiculo_por_placa(db, dados.placa)
    if veiculo_placa and veiculo_placa.id != id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A placa fornecida já está em uso por outro veículo.",
        )

    veiculo_identificacao = obter_veiculo_por_identificacao(
        db, dados.identificacao
    )
    if veiculo_identificacao and veiculo_identificacao.id != id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A identificação fornecida já está em uso por outro veículo.",
        )

    return atualizar_veiculo(db, veiculo, dados, autor_id=usuario_atual.id)
