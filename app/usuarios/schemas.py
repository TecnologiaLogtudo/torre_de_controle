from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict


class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    ativo: bool = True


class UsuarioCreate(UsuarioBase):
    senha: str


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    ativo: Optional[bool] = None


class UsuarioResponse(UsuarioBase):
    id: UUID
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
