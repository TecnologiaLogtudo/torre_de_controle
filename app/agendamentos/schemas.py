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
    pass

class AgendamentoUpdate(BaseModel):
    horario_inicio: Optional[time] = None
    status: Optional[str] = None

class AgendamentoResponse(AgendamentoBase):
    id: UUID
    status: str
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
