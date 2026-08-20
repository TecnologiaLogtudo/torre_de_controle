from typing import Optional, List
import uuid
from sqlalchemy.orm import Session
from app.veiculos.models import Veiculo
from app.veiculos.schemas import VeiculoCreate, VeiculoUpdate
from app.auditoria.services import registrar_auditoria


def obter_veiculo_por_id(db: Session, veiculo_id: uuid.UUID) -> Optional[Veiculo]:
    return db.query(Veiculo).filter(Veiculo.id == veiculo_id).first()


def obter_veiculo_por_placa(db: Session, placa: str) -> Optional[Veiculo]:
    return db.query(Veiculo).filter(Veiculo.placa == placa).first()


def obter_veiculo_por_identificacao(
    db: Session, identificacao: str
) -> Optional[Veiculo]:
    return (
        db.query(Veiculo).filter(Veiculo.identificacao == identificacao).first()
    )


def listar_veiculos(
    db: Session, limite: int = 50, offset: int = 0
) -> List[Veiculo]:
    return db.query(Veiculo).offset(offset).limit(limite).all()


def criar_veiculo(
    db: Session, dados: VeiculoCreate, autor_id: uuid.UUID
) -> Veiculo:
    """Cria um veículo e registra na auditoria."""
    veiculo = Veiculo(
        identificacao=dados.identificacao,
        placa=dados.placa.upper(),
        tipo_veiculo=dados.tipo_veiculo,
        especialidade=dados.especialidade,
        ativo=True,
    )
    db.add(veiculo)
    db.commit()
    db.refresh(veiculo)

    estado_posterior = {
        "id": str(veiculo.id),
        "identificacao": veiculo.identificacao,
        "placa": veiculo.placa,
        "tipo_veiculo": veiculo.tipo_veiculo,
        "especialidade": veiculo.especialidade,
        "ativo": veiculo.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="veiculos",
        entidade_id=veiculo.id,
        acao="CRIAR",
        estado_posterior=estado_posterior,
    )

    return veiculo


def atualizar_veiculo(
    db: Session,
    veiculo: Veiculo,
    dados: VeiculoUpdate,
    autor_id: uuid.UUID,
) -> Veiculo:
    """Atualiza dados do veículo e registra auditoria."""
    estado_anterior = {
        "id": str(veiculo.id),
        "identificacao": veiculo.identificacao,
        "placa": veiculo.placa,
        "tipo_veiculo": veiculo.tipo_veiculo,
        "especialidade": veiculo.especialidade,
        "ativo": veiculo.ativo,
    }

    veiculo.identificacao = dados.identificacao
    veiculo.placa = dados.placa.upper()
    veiculo.tipo_veiculo = dados.tipo_veiculo
    veiculo.especialidade = dados.especialidade
    veiculo.ativo = dados.ativo
    db.commit()
    db.refresh(veiculo)

    estado_posterior = {
        "id": str(veiculo.id),
        "identificacao": veiculo.identificacao,
        "placa": veiculo.placa,
        "tipo_veiculo": veiculo.tipo_veiculo,
        "especialidade": veiculo.especialidade,
        "ativo": veiculo.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="veiculos",
        entidade_id=veiculo.id,
        acao="ATUALIZAR",
        estado_anterior=estado_anterior,
        estado_posterior=estado_posterior,
    )

    return veiculo
