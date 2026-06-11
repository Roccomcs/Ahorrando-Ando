"""add provider_snapshots table

Revision ID: e6f2a3b4c5d1
Revises: d5e1b2c3a4f0
Create Date: 2026-06-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "e6f2a3b4c5d1"
down_revision = "d5e1b2c3a4f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "provider_snapshots",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("balance_usd", sa.Float(), nullable=False),
        sa.Column("snapshot_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provider_snapshots_user_provider", "provider_snapshots", ["user_id", "provider"])
    op.create_index("ix_provider_snapshots_snapshot_at", "provider_snapshots", ["snapshot_at"])


def downgrade() -> None:
    op.drop_index("ix_provider_snapshots_snapshot_at", table_name="provider_snapshots")
    op.drop_index("ix_provider_snapshots_user_provider", table_name="provider_snapshots")
    op.drop_table("provider_snapshots")
