import uuid
from typing import Generator
from sqlalchemy import Column, DateTime, create_engine, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Cria a engine de conexão do SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    # Configurações adicionais para pool se necessário
    pool_pre_ping=True,
)

# Cria a classe da sessão local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa do SQLAlchemy
Base = declarative_base()


class BaseEntidade(Base):
    """
    Classe abstrata base herdada por todas as tabelas.
    Define a chave primária UUID v4 e os timestamps com timezone (America/Bahia / UTC).
    """

    __abstract__ = True

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )

    criado_em = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    atualizado_em = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def get_db() -> Generator:
    """
    Dependência do FastAPI para obter a sessão de banco de dados por requisição.
    Garante o fechamento correto da sessão após o término do fluxo.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
