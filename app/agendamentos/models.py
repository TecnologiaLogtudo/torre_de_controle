from sqlalchemy import (
    Column,
    ForeignKey,
    String,
    Date,
    Time
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import BaseEntidade

class Agendamento(BaseEntidade):
    """Modelo de dados para agendamentos."""
    __tablename__ = "agendamentos"

    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="RESTRICT"), nullable=False)
    data = Column(Date, nullable=False)
    horario_inicio = Column(Time, nullable=False)
    status = Column(String(50), nullable=False, default="RASCUNHO") # RASCUNHO, PROGRAMADO, EM_EXECUCAO, CONCLUIDO, CANCELADO
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    contrato_configuracao_id = Column(UUID(as_uuid=True), ForeignKey("contratos_configuracoes.id", ondelete="RESTRICT"), nullable=True)
    
    empresa = relationship("Empresa")
    criado_por = relationship("Usuario")
    contrato_configuracao = relationship("ContratoConfiguracao")
    alocacoes = relationship("AlocacaoOperacional", back_populates="agendamento", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Agendamento id={self.id} empresa={self.empresa_id} data={self.data} status={self.status}>"

class AlocacaoOperacional(BaseEntidade):
    """Modelo para alocação de motorista e veículo num agendamento."""
    __tablename__ = "alocacoes_operacionais"

    agendamento_id = Column(UUID(as_uuid=True), ForeignKey("agendamentos.id", ondelete="CASCADE"), nullable=False)
    motorista_id = Column(UUID(as_uuid=True), ForeignKey("motoristas.id", ondelete="RESTRICT"), nullable=False)
    veiculo_id = Column(UUID(as_uuid=True), ForeignKey("veiculos.id", ondelete="RESTRICT"), nullable=False)
    categoria = Column(String(50), nullable=False) # DEDICADO, SPOT
    status_operacional = Column(String(50), nullable=False, default="PROGRAMADO") # DISPONIVEL, PROGRAMADO, EM_ROTA, INDISPONIVEL
    motivo_indisponibilidade_id = Column(UUID(as_uuid=True), ForeignKey("motivos_indisponibilidade.id", ondelete="SET NULL"), nullable=True)
    
    agendamento = relationship("Agendamento", back_populates="alocacoes")
    motorista = relationship("Motorista")
    veiculo = relationship("Veiculo")
    motivo_indisponibilidade = relationship("MotivoIndisponibilidade", foreign_keys=[motivo_indisponibilidade_id])

    def __repr__(self) -> str:
        return f"<AlocacaoOperacional agendamento={self.agendamento_id} motorista={self.motorista_id} veiculo={self.veiculo_id} status={self.status_operacional}>"

class HistoricoAgendamento(BaseEntidade):
    """Histórico de alterações na configuração do agendamento."""
    __tablename__ = "historico_agendamentos"
    
    agendamento_id = Column(UUID(as_uuid=True), ForeignKey("agendamentos.id", ondelete="CASCADE"), nullable=False)
    alterado_por_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    tipo_alteracao = Column(String(100), nullable=False) # Inclusão de SPOT, Horário alterado, etc.
    descricao = Column(String, nullable=False) # Ex: SPOT XYZ-1234 substituído por ABC-5678
    
    agendamento = relationship("Agendamento")
    alterado_por = relationship("Usuario")
    
    def __repr__(self) -> str:
        return f"<HistoricoAgendamento agendamento={self.agendamento_id} tipo={self.tipo_alteracao}>"
