from datetime import datetime
from typing import Dict, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_serializer
from app.core.datetime_utils import para_local


class ContratoConfiguracaoBase(BaseModel):
    data_inicio: datetime
    regras: Dict[str, int] = Field(
        ...,
        description="Mapeamento de capacidade de veículos, ex: {'HR': 4, 'Fiorino': 2}",
    )


class ContratoConfiguracaoCreate(ContratoConfiguracaoBase):
    pass


class ContratoConfiguracaoResponse(ContratoConfiguracaoBase):
    id: UUID
    empresa_id: UUID
    data_fim: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer(
        "data_inicio",
        "data_fim",
        "criado_em",
        "atualizado_em",
        check_fields=False,
    )
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        return para_local(dt).isoformat()


class MotoristaDedicadoVinculoCreate(BaseModel):
    empresa_id: UUID
    motorista_id: UUID
    veiculo_id: Optional[UUID] = None
    tipo_veiculo: str = Field(..., min_length=1, max_length=100)
    categoria_operacional: Literal["DEDICADO", "SPOT"]


class MotoristaDedicadoVinculoResponse(BaseModel):
    id: UUID
    empresa_id: UUID
    motorista_id: UUID
    veiculo_id: Optional[UUID] = None
    tipo_veiculo: str
    categoria_operacional: Literal["DEDICADO", "SPOT"]
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("criado_em", "atualizado_em", check_fields=False)
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        return para_local(dt).isoformat()
