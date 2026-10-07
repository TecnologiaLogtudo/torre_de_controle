from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime, date

# --- Motivos de Indisponibilidade ---
class MotivoIndisponibilidadeBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    ativo: bool = True

class MotivoIndisponibilidadeCreate(MotivoIndisponibilidadeBase):
    pass

class MotivoIndisponibilidadeUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    ativo: Optional[bool] = None

class MotivoIndisponibilidadeResponse(MotivoIndisponibilidadeBase):
    id: UUID
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True

# --- Configurações do Sistema ---
class ConfiguracaoSistemaBase(BaseModel):
    chave: str = Field(..., min_length=2, max_length=100)
    valor: str

class ConfiguracaoSistemaCreate(ConfiguracaoSistemaBase):
    pass

class ConfiguracaoSistemaUpdate(BaseModel):
    valor: str

class ConfiguracaoSistemaResponse(ConfiguracaoSistemaBase):
    id: UUID
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True

from typing import Optional, List, Dict

# --- Torre de Controle (Painel & Indicadores) ---
class ResumoTorreResponse(BaseModel):
    contratados: int = 0
    total: int = 0  # alocados ativos
    disponiveis: int = 0
    programados: int = 0
    em_rota: int = 0
    indisponiveis: int = 0
    vagas_nao_preenchidas: int = 0

class ResumoEmpresaTorreResponse(ResumoTorreResponse):
    empresa_id: UUID
    empresa_nome: str
    regras_capacidade: Dict[str, int] = {}

class DetalhamentoOperacionalResponse(BaseModel):
    empresa_id: Optional[UUID] = None
    empresa_nome: Optional[str] = None
    motorista_id: UUID
    motorista_nome: str
    veiculo_id: UUID
    veiculo_identificacao: str
    placa: str
    tipo_veiculo: str
    especialidade: str
    categoria: str
    status_operacional: str
    motivo_indisponibilidade: Optional[str] = None
    agendamento_id: Optional[UUID] = None
    alocacao_id: Optional[UUID] = None

# --- Status de Motoristas (Visão Consolidada) ---
class MotoristaStatusResponse(BaseModel):
    motorista_id: UUID
    motorista_nome: str
    empresa_id: Optional[UUID] = None
    empresa_nome: Optional[str] = None
    veiculo_id: Optional[UUID] = None
    veiculo_placa: Optional[str] = None
    veiculo_tipo: Optional[str] = None
    veiculo_especialidade: Optional[str] = None
    categoria: Optional[str] = None
    status_operacional: str  # DISPONIVEL, PROGRAMADO, EM_ROTA, INDISPONIVEL, SEM_ALOCACAO
    motivo_indisponibilidade: Optional[str] = None
    agendamento_id: Optional[UUID] = None
    alocacao_id: Optional[UUID] = None

class AlterarStatusMotoristaRequest(BaseModel):
    data: date
    novo_status: str  # DISPONIVEL, PROGRAMADO, EM_ROTA, INDISPONIVEL, SEM_ALOCACAO
    motivo_indisponibilidade_id: Optional[UUID] = None
    origem_alteracao: Optional[str] = "painel_status_motoristas"

class MotoristasStatusResponse(BaseModel):
    data: date
    total: int = 0
    disponiveis: int = 0
    programados: int = 0
    em_rota: int = 0
    indisponiveis: int = 0
    sem_alocacao: int = 0
    motoristas: List[MotoristaStatusResponse] = []

# --- Eventos Operacionais ---
class EventoOperacionalResponse(BaseModel):
    id: UUID
    empresa_id: UUID
    empresa_nome: Optional[str] = None
    motorista_id: UUID
    motorista_nome: Optional[str] = None
    veiculo_id: UUID
    veiculo_placa: Optional[str] = None
    agendamento_id: Optional[UUID] = None
    categoria: str
    status_anterior: str
    novo_status: str
    motivo_indisponibilidade: Optional[str] = None
    usuario_id: UUID
    usuario_nome: Optional[str] = None
    origem_alteracao: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True

# --- Importação de Planilha ---
class ItemIgnoradoImportacao(BaseModel):
    linha: int
    placa: str
    motorista: str
    motivo: str

class ResultadoImportacaoResponse(BaseModel):
    total_linhas: int
    criados_veiculos: int
    criados_motoristas: int
    criadas_empresas: int
    vinculos_dedicados_criados: int
    ignorados_placa_existente: int
    itens_ignorados: List[ItemIgnoradoImportacao] = []
 
# --- Alteração de Status em Lote ---
class StatusOperacionalLoteRequest(BaseModel):
    alocacao_ids: Optional[List[UUID]] = None
    motorista_ids: Optional[List[UUID]] = None
    data: Optional[date] = None
    novo_status: str
    motivo_indisponibilidade_id: Optional[UUID] = None
    observacao: Optional[str] = None
    origem_alteracao: Optional[str] = "lote"

class StatusOperacionalLoteResponse(BaseModel):
    sucesso: bool = True
    atualizados: int
    novo_status: str
    mensagem: str
