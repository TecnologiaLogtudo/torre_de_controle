from sqlalchemy import Column, String, DateTime, ForeignKey, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import BaseEntidade


class Auditoria(BaseEntidade):
    """
    Modelo de dados para a tabela de trilha de auditoria (auditorias).
    Registra modificações em entidades críticas do sistema.
    """

    __tablename__ = "auditorias"

    usuario_id = Column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    data_hora = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    entidade_afetada = Column(String(100), nullable=False)
    entidade_id = Column(UUID(as_uuid=True), nullable=False)
    acao = Column(String(50), nullable=False)  # CRIAR, ATUALIZAR, DELETAR
    estado_anterior = Column(JSONB, nullable=True)
    estado_posterior = Column(JSONB, nullable=True)

    # Relacionamento
    usuario = relationship("Usuario")

    __table_args__ = (
        CheckConstraint(
            "acao IN ('CRIAR', 'ATUALIZAR', 'DELETAR')",
            name="check_auditoria_acao",
        ),
    )

    def __repr__(self) -> str:
        return f"<Auditoria usuario_id={self.usuario_id} entidade={self.entidade_afetada} acao={self.acao}>"
