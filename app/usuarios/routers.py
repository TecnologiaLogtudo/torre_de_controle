from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session
import jwt
from app.core.config import settings
from app.core.database import get_db
from app.auth.services import obter_usuario_atual
from app.usuarios.models import Usuario
from uuid import UUID
from app.usuarios.schemas import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.usuarios.services import (
    obter_usuario_por_email,
    criar_usuario,
    obter_usuario_por_id,
    atualizar_usuario,
)

router = APIRouter()


def obter_usuario_autor(request: Request, db: Session) -> Usuario:
    """
    Valida a autenticação de forma dinâmica.
    Se o banco de dados de usuários estiver vazio, permite o cadastro livre (bootstrap).
    Caso contrário, exige obrigatoriamente um token JWT válido.
    """
    total_usuarios = db.query(Usuario).count()
    if total_usuarios == 0:
        return None  # Permite criação livre (bootstrap)

    # Exige token JWT
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais de autenticação ausentes.",
        )

    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esquema de autenticação inválido. Use Bearer.",
        )

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        usuario_id = payload.get("sub")
        if not usuario_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido.",
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado ou inválido.",
        )

    autor = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not autor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário autor não encontrado.",
        )
    if not autor.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário autor inativo.",
        )
    return autor


@router.post(
    "",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Usuário",
)
def cadastrar_usuario(
    dados: UsuarioCreate, request: Request, db: Session = Depends(get_db)
):
    """
    Cadastra um novo usuário administrador.
    Permite criação anônima caso seja o primeiro usuário do sistema (Bootstrap).
    """
    # Valida se o email já existe
    if obter_usuario_por_email(db, dados.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O e-mail informado já está cadastrado.",
        )

    autor = obter_usuario_autor(request, db)
    autor_id = autor.id if autor else None

    return criar_usuario(db, dados, autor_id=autor_id)


@router.get(
    "",
    response_model=List[UsuarioResponse],
    summary="Listar Usuários",
)
def listar_usuarios(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
    limite: int = 50,
    offset: int = 0,
):
    """Retorna a lista de usuários cadastrados no sistema (requer login)."""
    return db.query(Usuario).offset(offset).limit(limite).all()


@router.get(
    "/{id}",
    response_model=UsuarioResponse,
    summary="Obter Detalhes do Usuário",
)
def obter_usuario(
    id: UUID,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Retorna os dados do usuário pelo seu identificador UUID."""
    usuario = obter_usuario_por_id(db, id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )
    return usuario


@router.put(
    "/{id}",
    response_model=UsuarioResponse,
    summary="Atualizar Usuário",
)
def alterar_usuario(
    id: UUID,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Atualiza dados cadastrais ou status do usuário."""
    usuario = obter_usuario_por_id(db, id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    if dados.email and dados.email != usuario.email:
        existente = obter_usuario_por_email(db, dados.email)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O e-mail informado já está cadastrado para outro usuário.",
            )

    return atualizar_usuario(db, usuario, dados, autor_id=usuario_atual.id)
