from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class MotoristaBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)


class MotoristaCreate(MotoristaBase):
    pass


class MotoristaUpdate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    ativo: bool


class MotoristaResponse(MotoristaBase):
    id: UUID
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
