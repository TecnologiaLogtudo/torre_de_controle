from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginSchema(BaseModel):
    email: EmailStr
    senha: str


class TokenSchema(BaseModel):
    token_acesso: str
    tipo_token: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
