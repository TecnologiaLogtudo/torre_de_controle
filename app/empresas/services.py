from typing import Optional, List
import uuid
from sqlalchemy.orm import Session
from app.empresas.models import Empresa
from app.empresas.schemas import EmpresaCreate, EmpresaUpdate
from app.auditoria.services import registrar_auditoria


def obter_empresa_por_id(db: Session, empresa_id: uuid.UUID) -> Optional[Empresa]:
    return db.query(Empresa).filter(Empresa.id == empresa_id).first()


def obter_empresa_por_identificacao(
    db: Session, identificacao: str
) -> Optional[Empresa]:
    return (
        db.query(Empresa).filter(Empresa.identificacao == identificacao).first()
    )


def listar_empresas(
    db: Session, limite: int = 50, offset: int = 0
) -> List[Empresa]:
    return db.query(Empresa).offset(offset).limit(limite).all()


def criar_empresa(
    db: Session, dados: EmpresaCreate, autor_id: uuid.UUID
) -> Empresa:
    """Cria uma nova empresa e registra na auditoria."""
    empresa = Empresa(
        nome=dados.nome,
        identificacao=dados.identificacao,
        ativo=True,
    )
    db.add(empresa)
    db.commit()
    db.refresh(empresa)

    estado_posterior = {
        "id": str(empresa.id),
        "nome": empresa.nome,
        "identificacao": empresa.identificacao,
        "ativo": empresa.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="empresas",
        entidade_id=empresa.id,
        acao="CRIAR",
        estado_posterior=estado_posterior,
    )

    return empresa


def atualizar_empresa(
    db: Session,
    empresa: Empresa,
    dados: EmpresaUpdate,
    autor_id: uuid.UUID,
) -> Empresa:
    """Atualiza uma empresa e registra os estados anterior e posterior na auditoria."""
    estado_anterior = {
        "id": str(empresa.id),
        "nome": empresa.nome,
        "identificacao": empresa.identificacao,
        "ativo": empresa.ativo,
    }

    # Atualiza campos
    empresa.nome = dados.nome
    empresa.ativo = dados.ativo
    db.commit()
    db.refresh(empresa)

    estado_posterior = {
        "id": str(empresa.id),
        "nome": empresa.nome,
        "identificacao": empresa.identificacao,
        "ativo": empresa.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="empresas",
        entidade_id=empresa.id,
        acao="ATUALIZAR",
        estado_anterior=estado_anterior,
        estado_posterior=estado_posterior,
    )

    return empresa
