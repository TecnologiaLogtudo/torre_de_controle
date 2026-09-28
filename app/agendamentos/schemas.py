from typing import Optional, List
from uuid import UUID
from datetime import date, time, datetime
from pydantic import BaseModel, Field

# --- Alocações Operacionais ---
class AlocacaoOperacionalBase(BaseModel):
    motorista_id: UUID
    veiculo_id: UUID
    categoria: str = Field(..., description="DEDICADO ou SPOT")

class AlocacaoOperacionalCreate(AlocacaoOperacionalBase):
    pass

class AlocacaoOperacionalUpdate(BaseModel):
    motorista_id: Optional[UUID] = None
    veiculo_id: Optional[UUID] = None
    categoria: Optional[str] = None
    status_operacional: Optional[str] = None
    motivo_indisponibilidade_id: Optional[UUID] = None

class StatusOperacionalUpdate(BaseModel):
    novo_status: str = Field(..., description="DISPONIVEL, PROGRAMADO, EM_ROTA, INDISPONIVEL")
    motivo_indisponibilidade_id: Optional[UUID] = None
    origem_alteracao: Optional[str] = "painel_operacional"

class TrocaVeiculoDedicadoPayload(BaseModel):
    veiculo_id: UUID
    motivo: Optional[str] = Field(None, description="Motivo da substituição temporária do veículo do dedicado")

class AlocacaoInicialPayload(BaseModel):
    motorista_id: UUID
    veiculo_id: UUID
    categoria: Optional[str] = "SPOT"

class AlocacaoOperacionalResponse(AlocacaoOperacionalBase):
    id: UUID
    agendamento_id: UUID
    status_operacional: str
    motivo_indisponibilidade_id: Optional[UUID] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True

# --- Agendamento ---
class AgendamentoBase(BaseModel):
    empresa_id: UUID
    data: date
    horario_inicio: Optional[time] = Field(default=time(8, 0, 0))

class AgendamentoCreate(AgendamentoBase):
    alocacoes_iniciais: Optional[List[AlocacaoInicialPayload]] = None

class AgendamentoUpdate(BaseModel):
    horario_inicio: Optional[time] = None
    status: Optional[str] = None

class AgendamentoResponse(AgendamentoBase):
    id: UUID
    status: str
    versao: int = 1
    criado_por_id: UUID
    contrato_configuracao_id: Optional[UUID] = None
    alocacoes: List[AlocacaoOperacionalResponse] = []
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class HistoricoAgendamentoResponse(BaseModel):
    id: UUID
    agendamento_id: UUID
    alterado_por_id: UUID
    tipo_alteracao: str
    descricao: str
    criado_em: datetime

    class Config:
        from_attributes = True


class AgendamentoPaginadoResponse(BaseModel):
    items: List[AgendamentoResponse]
    total: int
    limite: int
    offset: int
