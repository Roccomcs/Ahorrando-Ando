"""Datos realistas para la cuenta pública de demostración.

La demo usa integraciones manuales con precios congelados: no depende de APIs
externas y siempre muestra el mismo portfolio. Cada inicio de demo restaura el
estado canónico para que una prueba anterior no deje datos rotos.
"""

import json
import math
import uuid
from datetime import datetime, timedelta, timezone

from infrastructure.database.postgres.models.audit_log_model import AuditLogModel
from infrastructure.database.postgres.models.integration_model import IntegrationModel
from infrastructure.database.postgres.models.portfolio_snapshot_model import (
    PortfolioSnapshotModel,
)
from infrastructure.database.postgres.models.price_alert_model import PriceAlertModel
from infrastructure.database.postgres.models.provider_snapshot_model import (
    ProviderSnapshotModel,
)
from infrastructure.database.postgres.models.push_subscription_model import (
    PushSubscriptionModel,
)
from infrastructure.database.postgres.models.transaction_model import TransactionModel
from infrastructure.database.postgres.models.user_model import UserModel
from infrastructure.encryption.fernet_encryption_service import FernetEncryptionService
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

DEMO_EMAIL = "demo@ahorrandoando.app"

_ACCOUNTS = [
    {
        "id": "demo-bank",
        "name": "Bancos y efectivo",
        "performance": {"24h": 0.05, "30d": 0.72},
        "holdings": [
            {
                "symbol": "USD",
                "name": "Dólares",
                "amount": 4800,
                "category": "fx",
                "price_usd": 1,
                "performance_24h": 0,
                "performance_30d": 0,
            },
            {
                "symbol": "ARS",
                "name": "Pesos argentinos",
                "amount": 3_250_000,
                "category": "fx",
                "price_usd": 0.00078,
                "performance_24h": -0.12,
                "performance_30d": -2.4,
            },
            {
                "symbol": "EUR",
                "name": "Euros",
                "amount": 900,
                "category": "fx",
                "price_usd": 1.09,
                "performance_24h": 0.18,
                "performance_30d": 1.3,
            },
        ],
    },
    {
        "id": "demo-crypto",
        "name": "Binance · Demo",
        "performance": {"24h": 2.31, "30d": 11.8},
        "holdings": [
            {
                "symbol": "BTC",
                "name": "Bitcoin",
                "amount": 0.12,
                "category": "crypto",
                "price_usd": 71_000,
                "performance_24h": 2.4,
                "performance_30d": 12.8,
            },
            {
                "symbol": "ETH",
                "name": "Ethereum",
                "amount": 1.8,
                "category": "crypto",
                "price_usd": 3800,
                "performance_24h": 1.7,
                "performance_30d": 9.4,
            },
            {
                "symbol": "SOL",
                "name": "Solana",
                "amount": 28,
                "category": "crypto",
                "price_usd": 172,
                "performance_24h": 4.2,
                "performance_30d": 18.6,
            },
            {
                "symbol": "USDT",
                "name": "Tether",
                "amount": 3200,
                "category": "crypto",
                "price_usd": 1,
                "performance_24h": 0.01,
                "performance_30d": 0.04,
            },
            {
                "symbol": "BNB",
                "name": "BNB",
                "amount": 4.5,
                "category": "crypto",
                "price_usd": 610,
                "performance_24h": -0.8,
                "performance_30d": 6.1,
            },
            {
                "symbol": "ADA",
                "name": "Cardano",
                "amount": 4500,
                "category": "crypto",
                "price_usd": 0.48,
                "performance_24h": -1.2,
                "performance_30d": -3.7,
            },
        ],
    },
    {
        "id": "demo-broker",
        "name": "Bull Market · Demo",
        "performance": {"24h": 0.84, "30d": 7.35},
        "holdings": [
            {
                "symbol": "AAPL",
                "name": "Apple CEDEAR",
                "amount": 140,
                "category": "cedear",
                "price_usd": 18.4,
                "performance_24h": 1.2,
                "performance_30d": 8.7,
            },
            {
                "symbol": "MSFT",
                "name": "Microsoft CEDEAR",
                "amount": 85,
                "category": "cedear",
                "price_usd": 21.7,
                "performance_24h": 0.7,
                "performance_30d": 6.9,
            },
            {
                "symbol": "NVDA",
                "name": "NVIDIA CEDEAR",
                "amount": 110,
                "category": "cedear",
                "price_usd": 16.3,
                "performance_24h": 2.8,
                "performance_30d": 15.2,
            },
            {
                "symbol": "SPY",
                "name": "S&P 500 CEDEAR",
                "amount": 60,
                "category": "cedear",
                "price_usd": 34.2,
                "performance_24h": 0.3,
                "performance_30d": 4.4,
            },
            {
                "symbol": "GGAL",
                "name": "Grupo Financiero Galicia",
                "amount": 350,
                "category": "stock",
                "price_usd": 5.8,
                "performance_24h": -0.6,
                "performance_30d": 9.8,
            },
            {
                "symbol": "YPFD",
                "name": "YPF",
                "amount": 90,
                "category": "stock",
                "price_usd": 22.4,
                "performance_24h": 1.1,
                "performance_30d": 5.6,
            },
            {
                "symbol": "AL30",
                "name": "Bono AL30",
                "amount": 2200,
                "category": "bond",
                "price_usd": 0.62,
                "performance_24h": -0.2,
                "performance_30d": 2.1,
            },
        ],
    },
    {
        "id": "demo-wallet",
        "name": "Mercado Pago · Demo",
        "performance": {"24h": 0.11, "30d": 2.9},
        "holdings": [
            {
                "symbol": "ARS",
                "name": "Saldo disponible",
                "amount": 1_850_000,
                "category": "fx",
                "price_usd": 0.00078,
                "performance_24h": -0.12,
                "performance_30d": -2.4,
            },
            {
                "symbol": "MPF",
                "name": "Mercado Fondo",
                "amount": 1,
                "category": "bond",
                "price_usd": 2180,
                "performance_24h": 0.09,
                "performance_30d": 2.8,
            },
        ],
    },
]


def _account_total(account: dict) -> float:
    return sum(float(h["amount"]) * float(h["price_usd"]) for h in account["holdings"])


class DemoAccountService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._encryption = FernetEncryptionService()

    async def reset(self) -> UserModel:
        """Crea/restaura la cuenta demo y devuelve el usuario bloqueado."""
        # Dos clics simultáneos no deben intentar insertar la misma cuenta ni
        # mezclar dos restauraciones. El lock vive solo durante esta transacción.
        await self._session.execute(text("SELECT pg_advisory_xact_lock(4102026)"))
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == DEMO_EMAIL).with_for_update()
        )
        user = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)

        if user is None:
            user = UserModel(
                id=str(uuid.uuid4()),
                email=DEMO_EMAIL,
                hashed_password=None,
                created_at=now,
                email_verified=True,
                google_id=None,
            )
            self._session.add(user)
            await self._session.flush()
        else:
            user.email_verified = True
            user.hashed_password = None

        await self._clear_demo_data(user.id)
        self._session.add_all(self._integrations(user.id, now))
        self._session.add_all(self._portfolio_history(user.id, now))
        self._session.add_all(self._provider_history(user.id, now))
        self._session.add_all(self._transactions(user.id, now))
        self._session.add_all(self._alerts(user.id, now))
        self._session.add_all(self._audit_logs(user.id, now))
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def _clear_demo_data(self, user_id: str) -> None:
        for model in (
            PushSubscriptionModel,
            PriceAlertModel,
            TransactionModel,
            ProviderSnapshotModel,
            PortfolioSnapshotModel,
            IntegrationModel,
            AuditLogModel,
        ):
            await self._session.execute(delete(model).where(model.user_id == user_id))

    def _integrations(self, user_id: str, now: datetime) -> list[IntegrationModel]:
        rows = []
        for account in _ACCOUNTS:
            credentials = {
                "institution_name": account["name"],
                "holdings": account["holdings"],
                "performance": account["performance"],
                "use_live_prices": False,
            }
            rows.append(
                IntegrationModel(
                    id=account["id"],
                    user_id=user_id,
                    type="manual",
                    encrypted_credentials=self._encryption.encrypt(
                        json.dumps(credentials)
                    ),
                    is_active=True,
                    last_error=None,
                    last_sync_at=now,
                )
            )
        return rows

    def _portfolio_history(
        self, user_id: str, now: datetime
    ) -> list[PortfolioSnapshotModel]:
        current = sum(_account_total(a) for a in _ACCOUNTS)
        rows = []
        for days_ago in range(90, 0, -1):
            progress = (90 - days_ago) / 90
            trend = 0.865 + 0.135 * progress
            wave = (
                math.sin(progress * math.pi * 8) * 0.018
                + math.sin(progress * math.pi * 3) * 0.012
            )
            rows.append(
                PortfolioSnapshotModel(
                    id=f"demo-portfolio-{days_ago:03d}",
                    user_id=user_id,
                    total_usd=round(current * (trend + wave), 2),
                    snapshot_at=(now - timedelta(days=days_ago)).replace(tzinfo=None),
                )
            )
        return rows

    def _provider_history(
        self, user_id: str, now: datetime
    ) -> list[ProviderSnapshotModel]:
        rows = []
        phases = (0.0, 0.8, 1.6, 2.4)
        for account_index, account in enumerate(_ACCOUNTS):
            current = _account_total(account)
            for days_ago in range(90, 0, -1):
                progress = (90 - days_ago) / 90
                trend = 0.88 + 0.12 * progress
                volatility = (0.004 + account_index * 0.004) * math.sin(
                    progress * math.pi * 8 + phases[account_index]
                )
                rows.append(
                    ProviderSnapshotModel(
                        id=f"demo-provider-{account_index}-{days_ago:03d}",
                        user_id=user_id,
                        provider=account["name"],
                        balance_usd=round(current * (trend + volatility), 2),
                        snapshot_at=now - timedelta(days=days_ago),
                    )
                )
        return rows

    def _transactions(self, user_id: str, now: datetime) -> list[TransactionModel]:
        templates = [
            ("deposit", 5000, "Bancos y efectivo", "USD", 5000, 1, "Ahorro mensual"),
            (
                "buy",
                -2130,
                "Binance · Demo",
                "BTC",
                0.03,
                71_000,
                "Compra periódica de Bitcoin",
            ),
            ("buy", -1520, "Binance · Demo", "ETH", 0.4, 3800, "Compra de Ethereum"),
            (
                "buy",
                -1288,
                "Bull Market · Demo",
                "AAPL",
                70,
                18.4,
                "Compra de CEDEAR Apple",
            ),
            (
                "yield",
                86.4,
                "Mercado Pago · Demo",
                "MPF",
                None,
                None,
                "Rendimiento de Mercado Fondo",
            ),
            ("sell", 860, "Binance · Demo", "SOL", 5, 172, "Toma parcial de ganancias"),
            (
                "buy",
                -1793,
                "Bull Market · Demo",
                "NVDA",
                110,
                16.3,
                "Compra de CEDEAR NVIDIA",
            ),
            ("withdrawal", -420, "Bancos y efectivo", "USD", 420, 1, "Gastos del mes"),
            (
                "buy",
                -1364,
                "Bull Market · Demo",
                "AL30",
                2200,
                0.62,
                "Compra de bonos AL30",
            ),
            (
                "yield",
                51.2,
                "Binance · Demo",
                "USDT",
                None,
                None,
                "Rendimiento de Earn",
            ),
        ]
        rows = []
        for i in range(36):
            tx_type, amount, account, symbol, quantity, price, note = templates[
                i % len(templates)
            ]
            occurred = now - timedelta(days=88 - i * 2, hours=(i * 3) % 18)
            rows.append(
                TransactionModel(
                    id=f"demo-tx-{i:03d}",
                    user_id=user_id,
                    tx_type=tx_type,
                    amount_usd=float(amount) * (1 + ((i % 5) - 2) * 0.015),
                    account=account,
                    asset_symbol=symbol,
                    quantity=quantity,
                    price_usd=price,
                    integration_id=None,
                    note=note,
                    occurred_at=occurred,
                    created_at=occurred,
                )
            )
        return rows

    def _alerts(self, user_id: str, now: datetime) -> list[PriceAlertModel]:
        return [
            PriceAlertModel(
                id="demo-alert-btc",
                user_id=user_id,
                asset_symbol="BTC",
                threshold_usd=75_000,
                direction="above",
                is_active=True,
                note="Tomar ganancias",
                created_at=now - timedelta(days=8),
                triggered_at=None,
            ),
            PriceAlertModel(
                id="demo-alert-eth",
                user_id=user_id,
                asset_symbol="ETH",
                threshold_usd=3200,
                direction="below",
                is_active=True,
                note="Evaluar compra",
                created_at=now - timedelta(days=5),
                triggered_at=None,
            ),
            PriceAlertModel(
                id="demo-alert-aapl",
                user_id=user_id,
                asset_symbol="AAPL",
                threshold_usd=17.5,
                direction="below",
                is_active=False,
                note="Alerta ya ejecutada",
                created_at=now - timedelta(days=24),
                triggered_at=now - timedelta(days=2),
            ),
        ]

    def _audit_logs(self, user_id: str, now: datetime) -> list[AuditLogModel]:
        actions = [
            ("register", 90),
            ("login", 21),
            ("change_password", 14),
            ("login", 3),
        ]
        return [
            AuditLogModel(
                id=f"demo-audit-{i}",
                user_id=user_id,
                action=action,
                ip_address="demo",
                user_agent="Cuenta de demostración",
                extra_data=None,
                created_at=now - timedelta(days=days),
            )
            for i, (action, days) in enumerate(actions)
        ]
