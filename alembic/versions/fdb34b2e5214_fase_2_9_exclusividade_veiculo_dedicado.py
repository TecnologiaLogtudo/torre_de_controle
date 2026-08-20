"""fase_2_9_exclusividade_veiculo_dedicado

Revision ID: fdb34b2e5214
Revises: d4840aacdb50
Create Date: 2026-08-20 16:09:53.378450

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fdb34b2e5214'
down_revision: Union[str, None] = 'd4840aacdb50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Índice de unicidade para veiculo_id ativo em motoristas_dedicados_vinculos
    op.create_index(
        'idx_unique_veiculo_dedicado_ativo',
        'motoristas_dedicados_vinculos',
        ['veiculo_id'],
        unique=True,
        postgresql_where=sa.text('ativo = true AND veiculo_id IS NOT NULL')
    )


def downgrade() -> None:
    op.drop_index(
        'idx_unique_veiculo_dedicado_ativo',
        table_name='motoristas_dedicados_vinculos',
        postgresql_where=sa.text('ativo = true AND veiculo_id IS NOT NULL')
    )
