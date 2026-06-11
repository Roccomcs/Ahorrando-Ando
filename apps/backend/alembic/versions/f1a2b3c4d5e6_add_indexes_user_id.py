"""add indexes user_id integrations price_alerts

Revision ID: f1a2b3c4d5e6
Revises: e6f2a3b4c5d1
Create Date: 2026-06-11

"""
from alembic import op

revision = "f1a2b3c4d5e6"
down_revision = "e6f2a3b4c5d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_integrations_user_id", "integrations", ["user_id"])
    op.create_index("ix_price_alerts_user_id", "price_alerts", ["user_id"])
    op.create_index("ix_price_alerts_is_active", "price_alerts", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_price_alerts_is_active", table_name="price_alerts")
    op.drop_index("ix_price_alerts_user_id", table_name="price_alerts")
    op.drop_index("ix_integrations_user_id", table_name="integrations")
