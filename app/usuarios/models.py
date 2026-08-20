from sqlalchemy import Boolean, Column, String
from app.core.database import BaseEntidade


class Usuario(BaseEntidade):
    """Modelo de dados para a tabela de usuários administrativos."""

    __tablename__ = "usuarios"

    nome = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    senha_hash = Column(String(255), nullable=False)
    ativo = Column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<Usuario nome={self.nome} email={self.email} ativo={self.ativo}>"
