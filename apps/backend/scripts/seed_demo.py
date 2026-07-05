#!/usr/bin/env python3
"""Seed de cuenta demo con datos realistas para testing.

Uso:
    python scripts/seed_demo.py

Crea una cuenta de prueba (prueba@gmail.com / Contra123456) con:
  - Integraciones: Binance + Manual (7 activos)
  - Snapshots: 6 días de historial
  - Alertas: 2 alertas activas
  - Transacciones: 5 movimientos
"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

from infrastructure.database.postgres.models.user_model import UserModel
from infrastructure.database.postgres.models.integration_model import IntegrationModel
from infrastructure.database.postgres.models.portfolio_snapshot_model import PortfolioSnapshotModel
from infrastructure.database.postgres.models.price_alert_model import PriceAlertModel
from infrastructure.database.postgres.models.transaction_model import TransactionModel
from infrastructure.encryption.fernet_encryption_service import FernetEncryptionService


async def seed():
    # Leer DATABASE_URL del entorno
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL no configurada en .env")
        return

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    user_id = "demo-user-" + str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc)

    async with async_session() as session:
        encryption = FernetEncryptionService()

        # 1. CREAR USUARIO
        user = UserModel(
            id=user_id,
            email="prueba@gmail.com",
            hashed_password=encryption.hash_password("Contra123456"),
            email_verified=True,
            created_at=now,
        )
        session.add(user)
        print(f"✓ Usuario creado: {user.email} (ID: {user_id})")

        # 2. CREAR INTEGRACIONES (Binance + Manual)
        binance_int = IntegrationModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            provider_type="binance",
            encrypted_credentials=encryption.encrypt('{"api_key": "demo", "api_secret": "demo"}'),
            is_active=True,
            created_at=now,
        )
        session.add(binance_int)

        # Integración manual con holdings variados
        manual_holdings = [
            {"symbol": "BTC", "name": "Bitcoin", "amount": 0.5, "category": "crypto", "ref": "bitcoin", "price_usd": 62000},
            {"symbol": "ETH", "name": "Ethereum", "amount": 5, "category": "crypto", "ref": "ethereum", "price_usd": 2400},
            {"symbol": "AAPL", "name": "Apple CEDEAR", "amount": 50, "category": "cedear", "ref": "AAPL", "price_usd": 180},
            {"symbol": "NVDA", "name": "NVIDIA CEDEAR", "amount": 30, "category": "cedear", "ref": "NVDA", "price_usd": 110},
            {"symbol": "AL30", "name": "Bonos Argentina 2030", "amount": 10000, "category": "bond", "ref": "AL30", "price_usd": 65},
            {"symbol": "PESOS", "name": "Efectivo ARS", "amount": 500000, "category": "fx", "ref": "ARS", "price_usd": 281},
            {"symbol": "USD", "name": "Dólares", "amount": 5000, "category": "fx", "ref": "USD", "price_usd": 1},
        ]
        manual_creds = {
            "institution_name": "Cuenta Manual",
            "holdings": manual_holdings
        }
        manual_int = IntegrationModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            provider_type="manual",
            encrypted_credentials=encryption.encrypt(json.dumps(manual_creds)),
            is_active=True,
            created_at=now,
        )
        session.add(manual_int)
        print(f"✓ Integraciones creadas: Binance + Manual (7 activos)")

        # 3. CREAR SNAPSHOTS DE PORTFOLIO (historial 6 días)
        total_usd = 0.5 * 62000 + 5 * 2400 + 50 * 180 + 30 * 110 + 10000 * 65 + 500000 / 281 + 5000

        for days_ago in [29, 20, 14, 7, 3, 0]:
            snapshot_date = now - timedelta(days=days_ago)
            # Simular volatilidad: -2% a +2% cada período
            variance = 1 + (days_ago % 5 - 2) * 0.01
            snapshot_total = total_usd * variance

            snapshot = PortfolioSnapshotModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                total_usd=snapshot_total,
                snapshot_at=snapshot_date,
            )
            session.add(snapshot)

        print(f"✓ Snapshots creados: 6 días de historial")

        # 4. CREAR ALERTAS DE PRECIO
        alert1 = PriceAlertModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            asset_symbol="BTC",
            threshold_usd=65000,
            direction="above",
            is_active=True,
            created_at=now,
            note="Cuando BTC suba de 65k",
        )
        alert2 = PriceAlertModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            asset_symbol="AAPL",
            threshold_usd=175,
            direction="below",
            is_active=True,
            created_at=now,
            note="Comprar si baja a 175",
        )
        session.add(alert1)
        session.add(alert2)
        print(f"✓ Alertas creadas: 2 alertas activas")

        # 5. CREAR TRANSACCIONES (movimientos del portafolio)
        transactions = [
            TransactionModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                tx_type="buy",
                amount_usd=-31000,  # negative = sale plata
                account="Manual",
                asset_symbol="BTC",
                quantity=0.5,
                price_usd=62000,
                integration_id=manual_int.id,
                occurred_at=now - timedelta(days=25),
                created_at=now,
            ),
            TransactionModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                tx_type="buy",
                amount_usd=-12000,
                account="Manual",
                asset_symbol="ETH",
                quantity=5,
                price_usd=2400,
                integration_id=manual_int.id,
                occurred_at=now - timedelta(days=20),
                created_at=now,
            ),
            TransactionModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                tx_type="buy",
                amount_usd=-9000,
                account="Manual",
                asset_symbol="AAPL",
                quantity=50,
                price_usd=180,
                integration_id=manual_int.id,
                occurred_at=now - timedelta(days=15),
                created_at=now,
            ),
            TransactionModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                tx_type="deposit",
                amount_usd=5000,  # positive = entra plata
                account="Manual",
                asset_symbol="USD",
                quantity=5000,
                price_usd=1,
                integration_id=manual_int.id,
                occurred_at=now - timedelta(days=10),
                created_at=now,
            ),
            TransactionModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                tx_type="deposit",
                amount_usd=177610,
                account="Manual",
                asset_symbol="PESOS",
                quantity=500000,
                price_usd=281,
                integration_id=manual_int.id,
                occurred_at=now - timedelta(days=5),
                created_at=now,
            ),
        ]
        for tx in transactions:
            session.add(tx)
        print(f"✓ Transacciones creadas: 5 movimientos de compra/depósito")

        # Commit
        await session.commit()
        print("\n✅ Seed completado. Cuenta lista para testing.")
        print(f"   Email: prueba@gmail.com")
        print(f"   Password: Contra123456")


if __name__ == "__main__":
    asyncio.run(seed())
