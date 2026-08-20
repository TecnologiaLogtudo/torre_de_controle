"""fase_2_9_contrato_configuracao_agendamento

Revision ID: 6c0ffd5f53b1
Revises: fdb34b2e5214
Create Date: 2026-08-20 16:13:13.884546

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c0ffd5f53b1'
down_revision: Union[str, None] = 'fdb34b2e5214'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agendamentos', sa.Column('contrato_configuracao_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_agendamentos_contrato_configuracao_id',
        'agendamentos',
        'contratos_configuracoes',
        ['contrato_configuracao_id'],
        ['id'],
        ondelete='RESTRICT'
    )


def downgrade() -> None:
    op.drop_constraint('fk_agendamentos_contrato_configuracao_id', 'agendamentos', type_='foreignkey')
    op.drop_column('agendamentos', 'contrato_configuracao_id')
