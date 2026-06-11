#!/usr/bin/env python3
"""
Rotación de ENCRYPTION_KEY.

Uso:
    python scripts/rotate_encryption_key.py --old-key <KEY_VIEJA> --new-key <KEY_NUEVA>

La KEY debe ser una clave Fernet válida (base64url, 32 bytes).
Para generar una nueva: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select, update

from infrastructure.database.postgres.connection import AsyncSessionFactory
from infrastructure.database.postgres.models.integration_model import IntegrationModel  # noqa: F401
from infrastructure.database.postgres.models.user_model import UserModel  # noqa: F401


async def rotate(old_key: str, new_key: str) -> None:
    old_fernet = Fernet(old_key.encode())
    new_fernet = Fernet(new_key.encode())

    async with AsyncSessionFactory() as session:
        result = await session.execute(select(IntegrationModel))
        integrations = result.scalars().all()

        rotated = 0
        failed = 0
        for integration in integrations:
            try:
                plaintext = old_fernet.decrypt(integration.encrypted_credentials.encode()).decode()
                new_encrypted = new_fernet.encrypt(plaintext.encode()).decode()
                integration.encrypted_credentials = new_encrypted
                rotated += 1
            except InvalidToken:
                print(f"  [WARN] No se pudo desencriptar integración {integration.id} — omitida")
                failed += 1

        await session.commit()

    print(f"\nRotación completa: {rotated} re-encriptadas, {failed} omitidas.")
    if failed:
        print("Las integraciones omitidas siguen con la key vieja y quedarán inutilizables.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Rota la ENCRYPTION_KEY de las credenciales almacenadas.")
    parser.add_argument("--old-key", required=True, help="Fernet key actual")
    parser.add_argument("--new-key", required=True, help="Nueva Fernet key")
    args = parser.parse_args()

    if args.old_key == args.new_key:
        print("La key nueva es igual a la vieja. Nada que hacer.")
        sys.exit(0)

    print(f"Rotando {0} integraciones...")
    asyncio.run(rotate(args.old_key, args.new_key))


if __name__ == "__main__":
    main()
