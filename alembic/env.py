import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Adiciona o diretório raiz do projeto ao path do Python para permitir imports de app/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Importa as configurações do app e a Base do Banco
from app.core.config import settings
from app.core.database import Base

# Importa todos os modelos para que o Alembic registre-os no Base.metadata
from app.usuarios.models import Usuario
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.contratos.models import ContratoConfiguracao, MotoristaDedicadoVinculo
from app.auditoria.models import Auditoria
from app.agendamentos.models import Agendamento, AlocacaoOperacional, HistoricoAgendamento
from app.operacao.models import MotivoIndisponibilidade, EventoOperacional, ConfiguracaoSistema

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Sobrescreve a URL do banco com a URL definida nas variáveis de ambiente (.env)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata do autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
