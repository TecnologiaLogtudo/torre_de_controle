from sqlalchemy import (
    Column,
    ForeignKey,
    String,
    Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import BaseEntidade
from app.agendamentos.models import Agendamento

class MotivoIndisponibilidade(BaseEntidade):
    """Motivos configuráveis para indisponibilidade de um motorista/veículo."""
    __tablename__ = "motivos_indisponibilidade"

    nome = Column(String(100), nullable=False)
    ativo = Column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<MotivoIndisponibilidade nome={self.nome} ativo={self.ativo}>"

class EventoOperacional(BaseEntidade):
    """Eventos históricos de mudança de status operacional."""
    __tablename__ = "eventos_operacionais"

    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="RESTRICT"), nullable=False)
    motorista_id = Column(UUID(as_uuid=True), ForeignKey("motoristas.id", ondelete="RESTRICT"), nullable=False)
    veiculo_id = Column(UUID(as_uuid=True), ForeignKey("veiculos.id", ondelete="RESTRICT"), nullable=False)
    agendamento_id = Column(UUID(as_uuid=True), ForeignKey("agendamentos.id", ondelete="SET NULL"), nullable=True)
    categoria = Column(String(50), nullable=False) # DEDICADO ou SPOT
    status_anterior = Column(String(50), nullable=False)
    novo_status = Column(String(50), nullable=False)
    motivo_indisponibilidade = Column(String(100), nullable=True) # Nome preservado historicamente
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    origem_alteracao = Column(String(100), nullable=True)

    empresa = relationship("Empresa")
    motorista = relationship("Motorista")
    veiculo = relationship("Veiculo")
    agendamento = relationship("Agendamento")
    usuario = relationship("Usuario")

    def __repr__(self) -> str:
        return f"<EventoOperacional motorista={self.motorista_id} status_anterior={self.status_anterior} novo={self.novo_status}>"

class ConfiguracaoSistema(BaseEntidade):
    """Configurações gerais parametrizáveis do sistema."""
    __tablename__ = "configuracoes_sistema"

    chave = Column(String(100), nullable=False, unique=True)
    valor = Column(String, nullable=False) # Ex: 12:00 para horario_limite_agendamento_dia_atual

    def __repr__(self) -> str:
        return f"<ConfiguracaoSistema chave={self.chave}>"
