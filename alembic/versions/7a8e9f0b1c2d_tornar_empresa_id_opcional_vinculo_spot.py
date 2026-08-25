"""tornar_empresa_id_opcional_vinculo_spot

Revision ID: 7a8e9f0b1c2d
Revises: 6c0ffd5f53b1
Create Date: 2026-08-24 20:18:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7a8e9f0b1c2d'
down_revision: Union[str, None] = '6c0ffd5f53b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Torna a coluna empresa_id opcional (nullable=True)
    op.alter_column(
        'motoristas_dedicados_vinculos',
        'empresa_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True
    )

    # 2. Atualiza os registros SPOT removendo a empresa vinculada
    op.execute(
        "UPDATE motoristas_dedicados_vinculos SET empresa_id = NULL WHERE categoria_operacional = 'SPOT'"
    )


def downgrade() -> None:
    # Em caso de rollback, associa vínculos sem empresa à primeira empresa disponível antes de restringir
    op.execute("""
        UPDATE motoristas_dedicados_vinculos
        SET empresa_id = (SELECT id FROM empresas ORDER BY criado_em ASC LIMIT 1)
        WHERE empresa_id IS NULL
    """)
    op.alter_column(
        'motoristas_dedicados_vinculos',
        'empresa_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False
    )
