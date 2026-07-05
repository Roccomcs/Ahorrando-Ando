from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.postgres.connection import Base


class TransactionModel(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    tx_type: Mapped[str] = mapped_column(String(12), nullable=False)
    amount_usd: Mapped[float] = mapped_column(Float, nullable=False)
    account: Mapped[str] = mapped_column(String(80), nullable=False)
    asset_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    integration_id: Mapped[str | None] = mapped_column(String, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_transactions_user_id", "user_id"),
        Index("ix_transactions_occurred_at", "occurred_at"),
    )
