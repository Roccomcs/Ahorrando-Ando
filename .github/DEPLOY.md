# Guía de Deploy

## Opción A — Railway (recomendado para empezar)

1. Crear cuenta en [railway.app](https://railway.app)
2. Nuevo proyecto → "Deploy from GitHub repo"
3. Agregar servicios: PostgreSQL, Redis, y el backend desde `apps/backend/`
4. Configurar variables de entorno en Railway:
   ```
   DATABASE_URL        (Railway lo setea automático si usás su Postgres)
   REDIS_URL           (Railway lo setea automático si usás su Redis)
   JWT_SECRET          (generar con: python -c "import secrets; print(secrets.token_hex(32))")
   ENCRYPTION_KEY      (generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
   ```
5. Agregar a GitHub Secrets:
   - `RAILWAY_TOKEN` → Settings → Account → Tokens en Railway

El CI/CD queda: push a `main` → CI pasa → CD deploya automáticamente.

---

## Opción B — VPS propio (Hetzner / DigitalOcean)

### 1. Preparar el servidor

```bash
# En el VPS (Ubuntu 24.04)
apt update && apt install -y docker.io docker-compose-plugin

# Red externa para Traefik
docker network create web

# Carpeta del proyecto
mkdir -p /opt/ahorrando-ando
cd /opt/ahorrando-ando
```

### 2. Archivos en el servidor

Subir al VPS:
- `docker-compose.prod.yml` (el de la raíz del repo)
- `apps/backend/.env.prod` con las variables reales

`.env.prod` mínimo:
```
DATABASE_URL=postgresql+asyncpg://ahorrando:<PASSWORD>@postgres:5432/ahorrando
REDIS_URL=redis://redis:6379
JWT_SECRET=<generar>
ENCRYPTION_KEY=<generar>
POSTGRES_PASSWORD=<generar>
DOMAIN=tudominio.com
ACME_EMAIL=tu@email.com
```

### 3. Primer deploy manual

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4. GitHub Secrets para CD automático

| Secret | Descripción |
|--------|-------------|
| `VPS_HOST` | IP o dominio del servidor |
| `VPS_USER` | Usuario SSH (ej: `root`) |
| `VPS_SSH_KEY` | Clave SSH privada (sin passphrase) |
| `REGISTRY_PASSWORD` | GitHub token con permisos `write:packages` |
| `NEXT_PUBLIC_API_URL` | `https://tudominio.com` |

Activar el workflow VPS: en `.github/workflows/cd-vps.yml` cambiar el trigger de `workflow_dispatch` a `push: branches: [main]`  
y deshabilitar `cd-railway.yml`.

---

## CI — Qué verifica en cada PR

| Check | Qué hace |
|-------|----------|
| Backend lint | `ruff check src/` |
| Backend tests | `pytest tests/unit/` |
| Frontend typecheck | `tsc --noEmit` |
| Frontend build | `next build` |

---

## Generar secrets

```bash
# JWT_SECRET
python -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# POSTGRES_PASSWORD (cualquier string seguro)
python -c "import secrets; print(secrets.token_urlsafe(24))"
```
