from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class VeiculoBase(BaseModel):
    identificacao: str = Field(..., min_length=1, max_length=100)
    placa: str = Field(..., min_length=1, max_length=10)
    tipo_veiculo: str = Field(..., min_length=1, max_length=100)
    especialidade: Literal["SECO", "REFRIGERADO"]


class VeiculoCreate(VeiculoBase):
    placa: str = Field(..., min_length=7, max_length=8)


class VeiculoUpdate(BaseModel):
    identificacao: str = Field(..., min_length=1, max_length=100)
    placa: str = Field(..., min_length=7, max_length=8)
    tipo_veiculo: str = Field(..., min_length=1, max_length=100)
    especialidade: Literal["SECO", "REFRIGERADO"]
    ativo: bool


class VeiculoResponse(VeiculoBase):
    id: UUID
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
