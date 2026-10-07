from sqlalchemy import (
    Column,
    ForeignKey,
    String,
    Boolean,
    Date,
    Index,
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

class StatusOperacionalMotorista(BaseEntidade):
    """Status operacional diário do motorista independente de agendamento de empresa."""
    __tablename__ = "status_operacional_motoristas"

    motorista_id = Column(UUID(as_uuid=True), ForeignKey("motoristas.id", ondelete="CASCADE"), nullable=False)
    data = Column(Date, nullable=False)
    status_operacional = Column(String(50), nullable=False, default="DISPONIVEL")  # DISPONIVEL, INDISPONIVEL, SEM_ALOCACAO
    motivo_indisponibilidade_id = Column(UUID(as_uuid=True), ForeignKey("motivos_indisponibilidade.id", ondelete="SET NULL"), nullable=True)

    motorista = relationship("Motorista")
    motivo_indisponibilidade = relationship("MotivoIndisponibilidade")

    __table_args__ = (
        Index("idx_status_motorista_data", "motorista_id", "data", unique=True),
    )

    def __repr__(self) -> str:
        return f"<StatusOperacionalMotorista motorista={self.motorista_id} data={self.data} status={self.status_operacional}>"

class EventoOperacional(BaseEntidade):
    """Eventos históricos de mudança de status operacional."""
    __tablename__ = "eventos_operacionais"

    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="RESTRICT"), nullable=True)
    motorista_id = Column(UUID(as_uuid=True), ForeignKey("motoristas.id", ondelete="RESTRICT"), nullable=False)
    veiculo_id = Column(UUID(as_uuid=True), ForeignKey("veiculos.id", ondelete="RESTRICT"), nullable=True)
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

    @property
    def empresa_nome(self):
        return self.empresa.nome if self.empresa else None

    @property
    def motorista_nome(self):
        return self.motorista.nome if self.motorista else None

    @property
    def veiculo_placa(self):
        return self.veiculo.placa if self.veiculo else None

    @property
    def usuario_nome(self):
        return self.usuario.nome if self.usuario else None

    def __repr__(self) -> str:
        return f"<EventoOperacional motorista={self.motorista_id} status_anterior={self.status_anterior} novo={self.novo_status}>"

class ConfiguracaoSistema(BaseEntidade):
    """Configurações gerais parametrizáveis do sistema."""
    __tablename__ = "configuracoes_sistema"

    chave = Column(String(100), nullable=False, unique=True)
    valor = Column(String, nullable=False) # Ex: 12:00 para horario_limite_agendamento_dia_atual

    def __repr__(self) -> str:
        return f"<ConfiguracaoSistema chave={self.chave}>"
