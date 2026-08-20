from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    CheckConstraint,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.core.database import BaseEntidade


class ContratoConfiguracao(BaseEntidade):
    """
    Modelo de dados para as configurações de contratos de capacidade das empresas.
    Possui controle de vigência temporal por meio de data_inicio e data_fim.
    """

    __tablename__ = "contratos_configuracoes"

    empresa_id = Column(
        ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False
    )
    data_inicio = Column(DateTime(timezone=True), nullable=False)
    data_fim = Column(DateTime(timezone=True), nullable=True)
    regras = Column(JSONB, nullable=False)  # Ex: {"HR": 4, "Fiorino": 4}

    # Relacionamento
    empresa = relationship("Empresa", backref="configuracoes")

    __table_args__ = (
        # Índice composto temporal para otimizar busca de vigência
        Index(
            "idx_contratos_config_vigencia",
            "empresa_id",
            "data_inicio",
            "data_fim",
        ),
    )

    def __repr__(self) -> str:
        return f"<ContratoConfiguracao empresa_id={self.empresa_id} inicio={self.data_inicio} fim={self.data_fim}>"


class MotoristaDedicadoVinculo(BaseEntidade):
    """
    Modelo de dados para os vínculos de motoristas dedicados a empresas.
    """

    __tablename__ = "motoristas_dedicados_vinculos"

    empresa_id = Column(
        ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False
    )
    motorista_id = Column(
        ForeignKey("motoristas.id", ondelete="CASCADE"), nullable=False
    )
    veiculo_id = Column(
        UUID(as_uuid=True), ForeignKey("veiculos.id", ondelete="CASCADE"), nullable=True
    )
    tipo_veiculo = Column(String(100), nullable=False)  # ex: Fiorino, HR, Truck
    categoria_operacional = Column(String(50), nullable=False)  # DEDICADO ou SPOT
    ativo = Column(Boolean, nullable=False, default=True)

    # Relacionamentos
    empresa = relationship("Empresa", backref="vinculos_motoristas")
    motorista = relationship("Motorista", backref="vinculos_empresas")
    veiculo = relationship("Veiculo", backref="vinculos_dedicados")

    __table_args__ = (
        # Um motorista só pode ter um único vínculo ativo por vez no sistema
        Index(
            "idx_unique_motorista_dedicado_ativo",
            "motorista_id",
            unique=True,
            postgresql_where=text("ativo = true"),
        ),
        # Um veículo só pode ter um único vínculo dedicado ativo por vez no sistema
        Index(
            "idx_unique_veiculo_dedicado_ativo",
            "veiculo_id",
            unique=True,
            postgresql_where=text("ativo = true AND veiculo_id IS NOT NULL"),
        ),
        # Restrição de categoria operacional
        CheckConstraint(
            "categoria_operacional IN ('DEDICADO', 'SPOT')",
            name="check_categoria_operacional",
        ),
    )

    def __repr__(self) -> str:
        return f"<MotoristaDedicadoVinculo empresa_id={self.empresa_id} motorista_id={self.motorista_id} ativo={self.ativo}>"
