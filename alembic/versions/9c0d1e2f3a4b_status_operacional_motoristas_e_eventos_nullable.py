"""status_operacional_motoristas_e_eventos_nullable

Revision ID: 9c0d1e2f3a4b
Revises: 8b9c0d1e2f3a
Create Date: 2026-10-07 14:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9c0d1e2f3a4b'
down_revision: Union[str, None] = '8b9c0d1e2f3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Flexibiliza empresa_id e veiculo_id em eventos_operacionais
    op.alter_column('eventos_operacionais', 'empresa_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.alter_column('eventos_operacionais', 'veiculo_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    # 2. Cria tabela status_operacional_motoristas
    op.create_table(
        'status_operacional_motoristas',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('motorista_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('data', sa.Date(), nullable=False),
        sa.Column('status_operacional', sa.String(length=50), server_default='DISPONIVEL', nullable=False),
        sa.Column('motivo_indisponibilidade_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['motorista_id'], ['motoristas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['motivo_indisponibilidade_id'], ['motivos_indisponibilidade.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_status_motorista_data', 'status_operacional_motoristas', ['motorista_id', 'data'], unique=True)


def downgrade() -> None:
    op.drop_index('idx_status_motorista_data', table_name='status_operacional_motoristas')
    op.drop_table('status_operacional_motoristas')
    op.alter_column('eventos_operacionais', 'veiculo_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.alter_column('eventos_operacionais', 'empresa_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
