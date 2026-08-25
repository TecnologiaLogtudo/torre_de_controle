from datetime import datetime
from typing import Dict, List, Literal, Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_validator
from app.core.datetime_utils import para_local


class CapacidadeItemSchema(BaseModel):
    tipo_veiculo: str
    especialidade: Optional[str] = "SECO"
    quantidade: int


class ContratoConfiguracaoBase(BaseModel):
    data_inicio: datetime
    regras: Any = Field(
        default_factory=dict,
        description="Mapeamento de capacidade de veículos, ex: {'HR': 4, 'Fiorino': 2}",
    )
    capacidades: Optional[List[CapacidadeItemSchema]] = None

    @model_validator(mode="before")
    @classmethod
    def preparar_regras_ou_capacidades(cls, values: Any) -> Any:
        if isinstance(values, dict):
            caps = values.get("capacidades")
            regras = values.get("regras")
            if caps and not regras:
                nova_regras = {}
                for item in caps:
                    if isinstance(item, dict):
                        tipo = item.get("tipo_veiculo")
                        qtd = item.get("quantidade", 1)
                        if tipo:
                            nova_regras[tipo] = nova_regras.get(tipo, 0) + int(qtd)
                    elif hasattr(item, "tipo_veiculo"):
                        nova_regras[item.tipo_veiculo] = nova_regras.get(item.tipo_veiculo, 0) + int(item.quantidade)
                values["regras"] = nova_regras
        return values


class ContratoConfiguracaoCreate(ContratoConfiguracaoBase):
    pass


class ContratoConfiguracaoResponse(ContratoConfiguracaoBase):
    id: UUID
    empresa_id: UUID
    data_fim: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def preencher_capacidades(self) -> "ContratoConfiguracaoResponse":
        if isinstance(self.regras, list):
            regras_dict = {}
            caps = []
            for item in self.regras:
                if isinstance(item, dict):
                    tipo = item.get("tipo_veiculo", "")
                    qtd = int(item.get("quantidade", 1))
                    esp = item.get("especialidade", "SECO")
                    regras_dict[tipo] = regras_dict.get(tipo, 0) + qtd
                    caps.append(CapacidadeItemSchema(tipo_veiculo=tipo, especialidade=esp, quantidade=qtd))
            self.regras = regras_dict
            if not self.capacidades:
                self.capacidades = caps
        elif self.capacidades is None and isinstance(self.regras, dict):
            self.capacidades = [
                CapacidadeItemSchema(tipo_veiculo=k, especialidade="SECO", quantidade=v)
                for k, v in self.regras.items()
            ]
        return self

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
    empresa_id: Optional[UUID] = None
    motorista_id: UUID
    veiculo_id: Optional[UUID] = None
    tipo_veiculo: Optional[str] = None
    categoria_operacional: Optional[Literal["DEDICADO", "SPOT"]] = None
    categoria: Optional[Literal["DEDICADO", "SPOT"]] = None

    @model_validator(mode="before")
    @classmethod
    def normalizar_categoria(cls, values: Any) -> Any:
        if isinstance(values, dict):
            cat = values.get("categoria_operacional") or values.get("categoria")
            if not cat:
                cat = "DEDICADO" if values.get("empresa_id") else "SPOT"
            values["categoria_operacional"] = cat
        return values


class MotoristaDedicadoVinculoResponse(BaseModel):
    id: UUID
    empresa_id: Optional[UUID] = None
    motorista_id: UUID
    veiculo_id: Optional[UUID] = None
    tipo_veiculo: str
    categoria_operacional: Literal["DEDICADO", "SPOT"]
    categoria: Optional[Literal["DEDICADO", "SPOT"]] = None
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def preencher_alias_categoria(self) -> "MotoristaDedicadoVinculoResponse":
        if self.categoria is None:
            self.categoria = self.categoria_operacional
        return self

    @field_serializer("criado_em", "atualizado_em", check_fields=False)
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        return para_local(dt).isoformat()

