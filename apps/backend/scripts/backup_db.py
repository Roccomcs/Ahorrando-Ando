#!/usr/bin/env python3
"""
Backup de la base de datos PostgreSQL.

Uso:
    python scripts/backup_db.py                    # backup a ./backups/
    python scripts/backup_db.py --output /ruta/    # backup a ruta específica

El script:
  1. Lee DATABASE_URL del entorno (o .env)
  2. Ejecuta pg_dump comprimido (.dump)
  3. Mantiene solo los últimos N backups (default: 7)

Para correr automáticamente, agregar a cron o GitHub Actions:
  0 3 * * * /ruta/al/.venv/bin/python /ruta/al/scripts/backup_db.py
"""

import argparse
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

DEFAULT_OUTPUT = Path(__file__).parent.parent / "backups"
KEEP_LAST_N = 7


def parse_db_url(url: str) -> dict:
    """Extrae credenciales de una DATABASE_URL de SQLAlchemy (postgresql+asyncpg://...)."""
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    m = re.match(r"postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(\S+)", url)
    if not m:
        raise ValueError(f"No se pudo parsear DATABASE_URL: {url!r}")
    user, password, host, port, dbname = m.groups()
    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port or "5432",
        "dbname": dbname,
    }


def run_backup(output_dir: Path, keep: int = KEEP_LAST_N) -> Path:
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL no definida.", file=sys.stderr)
        sys.exit(1)

    creds = parse_db_url(db_url)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = output_dir / f"backup_{creds['dbname']}_{timestamp}.dump"

    env = os.environ.copy()
    env["PGPASSWORD"] = creds["password"]

    cmd = [
        "pg_dump",
        "-Fc",  # custom format (comprimido)
        "-h", creds["host"],
        "-p", creds["port"],
        "-U", creds["user"],
        "-d", creds["dbname"],
        "-f", str(filename),
    ]

    print(f"Iniciando backup → {filename}")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"ERROR en pg_dump:\n{result.stderr}", file=sys.stderr)
        sys.exit(result.returncode)

    size_kb = filename.stat().st_size // 1024
    print(f"Backup completado ({size_kb} KB)")

    # Rotar: eliminar backups viejos
    backups = sorted(output_dir.glob("backup_*.dump"), key=lambda p: p.stat().st_mtime)
    for old in backups[:-keep]:
        old.unlink()
        print(f"Eliminado backup antiguo: {old.name}")

    return filename


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backup de PostgreSQL")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Directorio de salida")
    parser.add_argument("--keep", type=int, default=KEEP_LAST_N, help="Cantidad de backups a conservar")
    args = parser.parse_args()
    run_backup(Path(args.output), args.keep)
