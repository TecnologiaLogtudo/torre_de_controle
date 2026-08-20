import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

# Conexão de teste apontando para o mesmo banco local (com transação isolada e rollback)
engine_test = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionTesting = sessionmaker(
    autocommit=False, autoflush=False, bind=engine_test
)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Garante que as tabelas de teste existam no início e limpa no final."""
    # Cria tabelas se não existirem (embora o Alembic já faça)
    Base.metadata.create_all(bind=engine_test)
    yield
    # Limpa as tabelas ao final de todos os testes
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(name="db")
def db_fixture():
    """
    Cria uma sessão de banco de dados rodando dentro de uma transação.
    Ao final do teste, faz rollback automático garantindo que nenhum dado persista.
    """
    connection = engine_test.connect()
    transaction = connection.begin()
    db = SessionTesting(bind=connection)

    yield db

    db.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(name="client")
def client_fixture(db):
    """
    Cria um TestClient do FastAPI substituindo a dependência get_db
    pela sessão de banco de dados isolada do teste.
    """

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
