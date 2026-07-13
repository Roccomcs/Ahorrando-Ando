import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from domain.entities.user import User
from domain.repositories.i_user_repository import IUserRepository

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


# Arma la URL de autorización de Google con los parámetros del OAuth2. El estado sirve para prevenir CSRF.
def build_google_auth_url(state: str) -> str:
    from urllib.parse import urlencode
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{_GOOGLE_AUTH_URL}?{urlencode(params)}"


@dataclass
class GoogleUserInfo:
    google_id: str
    email: str
    email_verified: bool


# Intercambia el code de OAuth2 por un access_token y luego pide los datos del usuario a Google
async def fetch_google_user(code: str) -> GoogleUserInfo:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(_GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        token_resp.raise_for_status()
        id_token = token_resp.json().get("access_token")

        info_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {id_token}"},
        )
        info_resp.raise_for_status()
        data = info_resp.json()

    return GoogleUserInfo(
        google_id=data["sub"],
        email=data["email"],
        email_verified=data.get("email_verified", False),
    )


# Caso de uso que maneja el callback de Google OAuth2.
# Busca al usuario por google_id o email, lo crea si no existe, y devuelve la entidad User lista para generar tokens.
class HandleGoogleCallback:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._repo = user_repo

    async def execute(self, code: str) -> User:
        info = await fetch_google_user(code)

        # Buscar usuario existente por google_id o email
        existing = await self._repo.find_by_google_id(info.google_id)
        if not existing:
            existing = await self._repo.find_by_email(info.email)

        if existing:
            # Vincular google_id si aún no lo tiene, y marcar email como verificado
            if not existing.google_id or not existing.email_verified:
                updated = User(
                    id=existing.id,
                    email=existing.email,
                    hashed_password=existing.hashed_password,
                    created_at=existing.created_at,
                    email_verified=True,
                    google_id=info.google_id,
                )
                await self._repo.update_google(updated)
                return updated
            return existing

        # Crear nuevo usuario con Google
        new_user = User(
            id=str(uuid.uuid4()),
            email=info.email,
            hashed_password=None,
            created_at=datetime.now(timezone.utc),
            email_verified=True,
            google_id=info.google_id,
        )
        return await self._repo.save(new_user)
