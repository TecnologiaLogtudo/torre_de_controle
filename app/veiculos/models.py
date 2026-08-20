from sqlalchemy import Boolean, Column, String, CheckConstraint
from app.core.database import BaseEntidade


class Veiculo(BaseEntidade):
    """Modelo de dados para a tabela de veículos (frota)."""

    __tablename__ = "veiculos"

    identificacao = Column(String(100), nullable=False, unique=True)
    placa = Column(String(7), nullable=False, unique=True, index=True)
    tipo_veiculo = Column(String(100), nullable=False)  # ex: Fiorino, HR, Truck
    especialidade = Column(String(50), nullable=False)  # SECO ou REFRIGERADO
    ativo = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        CheckConstraint(
            "especialidade IN ('SECO', 'REFRIGERADO')",
            name="check_veiculo_especialidade",
        ),
    )

    def __repr__(self) -> str:
        return f"<Veiculo placa={self.placa} tipo={self.tipo_veiculo} especialidade={self.especialidade}>"
