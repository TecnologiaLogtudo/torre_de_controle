from typing import Optional
import uuid
from sqlalchemy.orm import Session
from app.core.security import obter_senha_hash
from app.usuarios.models import Usuario
from app.usuarios.schemas import UsuarioCreate, UsuarioUpdate
from app.auditoria.services import registrar_auditoria


def obter_usuario_por_id(db: Session, usuario_id: uuid.UUID) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def obter_usuario_por_email(db: Session, email: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.email == email).first()


def criar_usuario(
    db: Session, dados: UsuarioCreate, autor_id: Optional[uuid.UUID] = None
) -> Usuario:
    """Cria um novo usuário administrativo no banco de dados, aplicando hash na senha e auditando."""
    senha_hash = obter_senha_hash(dados.senha)
    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=senha_hash,
        ativo=dados.ativo,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    # Serialização do estado para auditoria
    estado_posterior = {
        "id": str(usuario.id),
        "nome": usuario.nome,
        "email": usuario.email,
        "ativo": usuario.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id or usuario.id,  # Se não houver autor, é o próprio usuário (bootstrap)
        entidade_afetada="usuarios",
        entidade_id=usuario.id,
        acao="CRIAR",
        estado_posterior=estado_posterior,
    )

    return usuario


def atualizar_usuario(
    db: Session, usuario: Usuario, dados: UsuarioUpdate, autor_id: uuid.UUID
) -> Usuario:
    estado_anterior = {
        "nome": usuario.nome,
        "email": usuario.email,
        "ativo": usuario.ativo,
    }

    if dados.nome is not None:
        usuario.nome = dados.nome
    if dados.email is not None and dados.email != usuario.email:
        usuario.email = dados.email
    if dados.ativo is not None:
        usuario.ativo = dados.ativo

    db.commit()
    db.refresh(usuario)

    estado_posterior = {
        "nome": usuario.nome,
        "email": usuario.email,
        "ativo": usuario.ativo,
    }

    registrar_auditoria(
        db=db,
        usuario_id=autor_id,
        entidade_afetada="usuarios",
        entidade_id=usuario.id,
        acao="ATUALIZAR",
        estado_anterior=estado_anterior,
        estado_posterior=estado_posterior,
    )

    return usuario
