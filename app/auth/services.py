from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from app.core.config import settings
from app.core.database import get_db
from app.usuarios.models import Usuario
from app.auth.schemas import TokenPayload

# Define o fluxo OAuth2 para extração automática de token do header Authorization
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def obter_usuario_atual(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> Usuario:
    """
    Dependência do FastAPI para validar o token JWT e injetar o usuário atual autenticado.
    Lança erro 401 caso o token seja inválido ou o usuário não exista/esteja inativo.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais de acesso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenPayload(sub=username)
    except jwt.PyJWTError:
        raise credentials_exception

    # Busca o usuário no banco
    usuario = (
        db.query(Usuario).filter(Usuario.id == token_data.sub).first()
    )
    if usuario is None:
        raise credentials_exception
    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O usuário está inativo no sistema.",
        )
    return usuario
