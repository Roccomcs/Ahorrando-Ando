import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.auth.login_dto import LoginDTO, RefreshDTO, TokenDTO
from application.dtos.auth.register_dto import RegisterDTO
from application.dtos.auth.user_dto import UserDTO
from application.services.audit_service import AuditService
from application.use_cases.auth.google_oauth import HandleGoogleCallback, build_google_auth_url
from application.use_cases.auth.login_user import LoginUser
from application.use_cases.auth.register_user import RegisterUser
from domain.entities.user import User
from infrastructure.cache.redis_token_blacklist_service import RedisTokenBlacklistService
from infrastructure.cache.redis_verification_service import RedisVerificationService
from infrastructure.database.postgres.repositories.postgres_audit_log_repository import PostgresAuditLogRepository
from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository
from infrastructure.services.email_service import EmailService
from interfaces.http.dependencies.get_db_session import get_db_session

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60
REFRESH_TOKEN_DAYS = 30
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

_blacklist = RedisTokenBlacklistService()
_email_svc = EmailService()
_verify_svc = RedisVerificationService(namespace="email_verify")
_reset_svc = RedisVerificationService(namespace="pwd_reset")


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode({"sub": user_id, "type": "access", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)
    return jwt.encode({"sub": user_id, "type": "refresh", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _make_token_pair(user_id: str) -> TokenDTO:
    return TokenDTO(
        access_token=_create_access_token(user_id),
        refresh_token=_create_refresh_token(user_id),
    )


class AuthController:
    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self._session = session
        self._repo = PostgresUserRepository(session)
        self._audit = AuditService(PostgresAuditLogRepository(session))

    async def register(self, dto: RegisterDTO, request: Request) -> TokenDTO:
        use_case = RegisterUser(self._repo)
        hashed = _hash_password(dto.password)
        user = await use_case.execute(dto, hashed)
        await self._audit.log("register", request, user_id=user.id, metadata={"email": dto.email})

        # Enviar código de verificación de email
        try:
            code = await _verify_svc.generate_and_store(dto.email)
            await _email_svc.send_verification_code(dto.email, code)
        except Exception:
            logger.warning("No se pudo enviar email de verificación a %s", dto.email)

        return _make_token_pair(user.id)

    async def login(self, dto: LoginDTO, request: Request) -> TokenDTO:
        user = await self._repo.find_by_email(dto.email)
        if not user or not user.hashed_password or not _verify_password(dto.password, user.hashed_password):
            await self._audit.log("login_failed", request, metadata={"email": dto.email})
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

        if not user.email_verified:
            # Reenviar código automáticamente
            try:
                code = await _verify_svc.generate_and_store(dto.email)
                await _email_svc.send_verification_code(dto.email, code)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="email_not_verified",
            )

        await self._audit.log("login", request, user_id=user.id)
        return _make_token_pair(user.id)

    async def me(self, current_user: User) -> UserDTO:
        return UserDTO(
            id=current_user.id,
            email=current_user.email,
            created_at=current_user.created_at,
            email_verified=current_user.email_verified,
        )

    async def refresh(self, dto: RefreshDTO, request: Request) -> TokenDTO:
        invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")
        try:
            payload = jwt.decode(dto.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                raise invalid
            user_id: str = payload.get("sub")
            if not user_id:
                raise invalid
        except JWTError:
            raise invalid

        if await _blacklist.is_blacklisted(dto.refresh_token):
            raise invalid

        user = await self._repo.find_by_id(user_id)
        if not user:
            raise invalid

        await _blacklist.add(dto.refresh_token, ttl_seconds=REFRESH_TOKEN_DAYS * 86400)
        await self._audit.log("refresh_token", request, user_id=user_id)
        return _make_token_pair(user.id)

    async def logout(self, dto: RefreshDTO, request: Request, current_user: User) -> dict:
        try:
            payload = jwt.decode(dto.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") == "refresh" and payload.get("sub") == current_user.id:
                await _blacklist.add(dto.refresh_token, ttl_seconds=REFRESH_TOKEN_DAYS * 86400)
        except JWTError:
            pass
        await self._audit.log("logout", request, user_id=current_user.id)
        return {"detail": "Sesión cerrada"}

    async def send_verification(self, email: str) -> dict:
        user = await self._repo.find_by_email(email)
        # Respuesta idéntica tanto si el usuario existe como si no (evita enumeración)
        if user and not user.email_verified:
            try:
                code = await _verify_svc.generate_and_store(email)
                await _email_svc.send_verification_code(email, code)
            except Exception as exc:
                logger.error("Error enviando verificación a %s: %s", email, exc)
        return {"detail": "Si el email existe, recibirás un código"}

    async def verify_email(self, email: str, code: str) -> TokenDTO:
        user = await self._repo.find_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido o expirado")

        if user.email_verified:
            return _make_token_pair(user.id)

        ok = await _verify_svc.verify(email, code)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido o expirado")

        await self._repo.mark_email_verified(user.id)
        return _make_token_pair(user.id)

    async def google_start(self, request: Request) -> RedirectResponse:
        # Sin credenciales configuradas, mandar a Google rompería con un error
        # críptico: volver al login con un mensaje claro.
        if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_REDIRECT_URI"):
            logger.error("Google OAuth no configurado: faltan GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI en .env")
            return RedirectResponse(f"{FRONTEND_URL}/login?error=oauth_unconfigured")
        state = secrets.token_urlsafe(16)
        url = build_google_auth_url(state)
        return RedirectResponse(url)

    async def google_callback(self, code: str, request: Request) -> RedirectResponse:
        try:
            use_case = HandleGoogleCallback(self._repo)
            user = await use_case.execute(code)
            await self._audit.log("login", request, user_id=user.id, metadata={"method": "google"})
            tokens = _make_token_pair(user.id)
            from urllib.parse import urlencode
            params = urlencode({"at": tokens.access_token, "rt": tokens.refresh_token})
            return RedirectResponse(f"{FRONTEND_URL}/api/auth/google/callback?{params}")
        except Exception as exc:
            logger.error("Google OAuth error: %s", exc)
            return RedirectResponse(f"{FRONTEND_URL}/login?error=oauth_failed")

    async def forgot_password(self, email: str) -> dict:
        user = await self._repo.find_by_email(email)
        if user and user.hashed_password:  # solo usuarios con contraseña (no Google-only)
            try:
                code = await _reset_svc.generate_and_store(email)
                await _email_svc.send_password_reset_code(email, code)
            except Exception as exc:
                logger.error("Error enviando reset a %s: %s", email, exc)
        return {"detail": "Si el email existe, recibirás un código para resetear tu contraseña"}

    async def reset_password(self, email: str, code: str, new_password: str) -> TokenDTO:
        user = await self._repo.find_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido o expirado")

        ok = await _reset_svc.verify(email, code)
        if not ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido o expirado")

        hashed = _hash_password(new_password)
        await self._repo.update_password(user.id, hashed)
        # Si el email no estaba verificado, esta acción también lo verifica
        if not user.email_verified:
            await self._repo.mark_email_verified(user.id)
        return _make_token_pair(user.id)

    async def change_password(self, current_user: User, current_password: str, new_password: str) -> dict:
        if not current_user.hashed_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta cuenta usa Google. No podés cambiar la contraseña.")
        if not _verify_password(current_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contraseña actual incorrecta")
        hashed = _hash_password(new_password)
        await self._repo.update_password(current_user.id, hashed)
        return {"detail": "Contraseña actualizada"}

    async def delete_account(self, current_user: User, confirm_email: str) -> dict:
        if confirm_email.lower() != current_user.email.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email de confirmación no coincide")
        from application.use_cases.auth.delete_account import DeleteAccount
        await DeleteAccount(self._session).execute(current_user.id)
        return {"detail": "Cuenta eliminada"}

    async def get_audit_log(self, user_id: str) -> list:
        from application.dtos.auth.audit_log_dto import AuditLogDTO
        logs = await PostgresAuditLogRepository(self._session).find_by_user(user_id)
        return [
            AuditLogDTO(
                id=l.id,
                action=l.action,
                ip_address=l.ip_address,
                user_agent=l.user_agent,
                metadata=l.metadata,
                created_at=l.created_at,
            )
            for l in logs
        ]
