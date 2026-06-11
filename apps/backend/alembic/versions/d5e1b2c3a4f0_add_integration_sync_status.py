"""add integration sync status

Revision ID: d5e1b2c3a4f0
Revises: c4f812a9d001
Create Date: 2026-06-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "d5e1b2c3a4f0"
down_revision = "c4f812a9d001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("integrations", sa.Column("last_error", sa.String(), nullable=True))
    op.add_column("integrations", sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("integrations", "last_sync_at")
    op.drop_column("integrations", "last_error")
