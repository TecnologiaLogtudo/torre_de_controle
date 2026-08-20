from sqlalchemy import Boolean, Column, String
from app.core.database import BaseEntidade


class Empresa(BaseEntidade):
    """Modelo de dados para a tabela de empresas parceiras/transportadoras."""

    __tablename__ = "empresas"

    nome = Column(String(255), nullable=False)
    identificacao = Column(String(18), nullable=False, unique=True, index=True)
    ativo = Column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<Empresa nome={self.nome} identificacao={self.identificacao} ativo={self.ativo}>"
