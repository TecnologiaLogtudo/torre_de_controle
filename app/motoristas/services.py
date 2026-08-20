from typing import Optional, List
import uuid
from sqlalchemy.orm import Session
from app.motoristas.models import Motorista
from app.motoristas.schemas import MotoristaCreate, MotoristaUpdate
from app.auditoria.services import registrar_auditoria


def obter_motorista_por_id(
    db: Session, motorista_id: uuid.UUID
) -> Optional[Motorista]:
    return db.query(Motorista).filter(Motorista.id == motorista_id).first()


def listar_motoristas(
    db: Session, limite: int = 50, offset: int = 0
) -> List[Motorista]:
    return db.query(Motorista).offset(offset).limit(limite).all()


def criar_motorista(
    db: Session, dados: MotoristaCreate, autor_id: uuid.UUID
) -> Motorista:
    """Cria um novo motorista e gera auditoria."""
    motorista = Motorista(
        nome=dados.nome,
        ativo=True,
    )
    db.add(motorista)
    db.commit()
    db.refresh(motorista)

    estado_posterior = {
        "id": str(motorista.id),
        "nome": motorista.nome,
        "ativo": motorista.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="motoristas",
        entidade_id=motorista.id,
        acao="CRIAR",
        estado_posterior=estado_posterior,
    )

    return motorista


def atualizar_motorista(
    db: Session,
    motorista: Motorista,
    dados: MotoristaUpdate,
    autor_id: uuid.UUID,
) -> Motorista:
    """Atualiza o motorista e grava trilha de auditoria anterior e posterior."""
    estado_anterior = {
        "id": str(motorista.id),
        "nome": motorista.nome,
        "ativo": motorista.ativo,
    }

    motorista.nome = dados.nome
    motorista.ativo = dados.ativo
    db.commit()
    db.refresh(motorista)

    estado_posterior = {
        "id": str(motorista.id),
        "nome": motorista.nome,
        "ativo": motorista.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="motoristas",
        entidade_id=motorista.id,
        acao="ATUALIZAR",
        estado_anterior=estado_anterior,
        estado_posterior=estado_posterior,
    )

    return motorista
