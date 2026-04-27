"""add direccion snapshot columns to pedido

Revision ID: c1d2e3f4a5b6
Revises: 83232153839b
Create Date: 2026-04-20 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c1d2e3f4a5b6"
down_revision = "83232153839b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pedido",
        sa.Column("direccion_snapshot_linea1", sa.Text(), nullable=True),
    )
    op.add_column(
        "pedido",
        sa.Column("direccion_snapshot_ciudad", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "pedido",
        sa.Column("direccion_snapshot_alias", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pedido", "direccion_snapshot_alias")
    op.drop_column("pedido", "direccion_snapshot_ciudad")
    op.drop_column("pedido", "direccion_snapshot_linea1")
