from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verificar_senha, criar_token_acesso
from app.usuarios.models import Usuario
from app.auth.schemas import LoginSchema, TokenSchema
from app.auth.services import obter_usuario_atual
from app.usuarios.schemas import UsuarioResponse

router = APIRouter()


@router.post("/login", response_model=TokenSchema, summary="Autenticar Usuário")
def login(dados_login: LoginSchema, db: Session = Depends(get_db)):
    """
    Realiza a autenticação do usuário retornando o token JWT.
    """
    usuario = (
        db.query(Usuario)
        .filter(Usuario.email == dados_login.email)
        .first()
    )
    if not usuario or not verificar_senha(dados_login.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O usuário está inativo.",
        )

    # Cria o token de acesso codificando o ID do usuário como string
    token_acesso = criar_token_acesso(sub=str(usuario.id))
    return {"token_acesso": token_acesso, "tipo_token": "bearer"}


@router.get("/me", response_model=UsuarioResponse, summary="Obter dados do usuário autenticado")
def obter_usuario_logado(
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Retorna os dados do usuário autenticado extraído do token JWT."""
    return usuario_atual
