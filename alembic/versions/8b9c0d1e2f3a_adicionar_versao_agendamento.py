"""adicionar_versao_agendamento

Revision ID: 8b9c0d1e2f3a
Revises: 7a8e9f0b1c2d
Create Date: 2026-09-29 15:52:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b9c0d1e2f3a'
down_revision: Union[str, None] = '7a8e9f0b1c2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adiciona a coluna 'versao' na tabela de agendamentos
    op.add_column(
        'agendamentos',
        sa.Column('versao', sa.Integer(), nullable=False, server_default='1')
    )


def downgrade() -> None:
    op.drop_column('agendamentos', 'versao')
