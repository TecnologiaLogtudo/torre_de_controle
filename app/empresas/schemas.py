from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class EmpresaBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    identificacao: str = Field(
        ..., min_length=1, max_length=20
    )  # CPF/CNPJ ou código identificador


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    ativo: bool


class EmpresaResponse(EmpresaBase):
    id: UUID
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
