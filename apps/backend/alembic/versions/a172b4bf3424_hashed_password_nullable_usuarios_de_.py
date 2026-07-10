"""hashed_password nullable (usuarios de Google no tienen)

Revision ID: a172b4bf3424
Revises: a7b8c9d0e1f2
Create Date: 2026-07-10 03:00:52.910568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a172b4bf3424'
down_revision: Union[str, None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # El esquema inicial la creó NOT NULL y el modelo hace rato dice
    # `Mapped[str | None]`, pero nunca se migró: los usuarios que entran con
    # Google no tienen contraseña y el INSERT rompía con NotNullViolationError.
    op.alter_column("users", "hashed_password", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    # Solo puede volver atrás si no quedó ningún usuario de Google.
    op.alter_column("users", "hashed_password", existing_type=sa.String(), nullable=False)
