from sqlalchemy import Boolean, Column, String
from app.core.database import BaseEntidade


class Motorista(BaseEntidade):
    """Modelo de dados para a tabela de motoristas."""

    __tablename__ = "motoristas"

    nome = Column(String(255), nullable=False)
    ativo = Column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<Motorista nome={self.nome} ativo={self.ativo}>"
