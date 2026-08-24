from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime

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

# --- Eventos Operacionais ---
class EventoOperacionalResponse(BaseModel):
    id: UUID
    empresa_id: UUID
    motorista_id: UUID
    veiculo_id: UUID
    agendamento_id: Optional[UUID] = None
    categoria: str
    status_anterior: str
    novo_status: str
    motivo_indisponibilidade: Optional[str] = None
    usuario_id: UUID
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
