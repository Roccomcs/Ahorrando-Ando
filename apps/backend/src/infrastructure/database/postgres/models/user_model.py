from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.postgres.connection import Base


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    google_id: Mapped[str | None] = mapped_column(String, nullable=True)
