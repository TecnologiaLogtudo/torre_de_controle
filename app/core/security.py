from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union
import jwt
import bcrypt
from app.core.config import settings
from app.core.datetime_utils import agora_utc


def obter_senha_hash(senha: str) -> str:
    """Gera um hash bcrypt seguro para a senha fornecida."""
    # O bcrypt espera bytes
    senha_bytes = senha.encode("utf-8")
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(senha_bytes, salt)
    return hash_bytes.decode("utf-8")


def verificar_senha(senha_pura: str, senha_hash: str) -> bool:
    """Verifica se a senha pura corresponde ao hash bcrypt salvo."""
    try:
        senha_bytes = senha_pura.encode("utf-8")
        hash_bytes = senha_hash.encode("utf-8")
        return bcrypt.checkpw(senha_bytes, hash_bytes)
    except Exception:
        return False


def criar_token_acesso(
    sub: Union[str, Any], expira_em: Optional[timedelta] = None
) -> str:
    """Gera um token JWT contendo o assunto (sub) e tempo de expiração."""
    agora = agora_utc()
    if expira_em:
        expiracao = agora + expira_em
    else:
        expiracao = agora + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(sub),
        "iat": agora.timestamp(),
        "exp": expiracao.timestamp(),
    }

    token = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token


def verificar_token_acesso(token: str) -> Optional[Dict[str, Any]]:
    """Decodifica e valida o token JWT. Retorna o payload se válido ou None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.PyJWTError:
        return None
