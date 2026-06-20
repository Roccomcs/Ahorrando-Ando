import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.auth.login_dto import LoginDTO, RefreshDTO, TokenDTO
from application.dtos.auth.register_dto import RegisterDTO
from application.dtos.auth.user_dto import UserDTO
from application.services.audit_service import AuditService
from application.use_cases.auth.login_user import LoginUser
from application.use_cases.auth.register_user import RegisterUser
from domain.entities.user import User
from infrastructure.cache.redis_token_blacklist_service import RedisTokenBlacklistService
from infrastructure.database.postgres.repositories.postgres_audit_log_repository import PostgresAuditLogRepository
from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository
from interfaces.http.dependencies.get_db_session import get_db_session

SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60
REFRESH_TOKEN_DAYS = 30

_blacklist = RedisTokenBlacklistService()


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
        return _make_token_pair(user.id)

    async def login(self, dto: LoginDTO, request: Request) -> TokenDTO:
        user = await self._repo.find_by_email(dto.email)
        if not user or not _verify_password(dto.password, user.hashed_password):
            await self._audit.log("login_failed", request, metadata={"email": dto.email})
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
        await self._audit.log("login", request, user_id=user.id)
        return _make_token_pair(user.id)

    async def me(self, current_user: User) -> UserDTO:
        return UserDTO(id=current_user.id, email=current_user.email, created_at=current_user.created_at)

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

        # Rotar: invalidar el refresh token usado, emitir par nuevo
        await _blacklist.add(dto.refresh_token, ttl_seconds=REFRESH_TOKEN_DAYS * 86400)
        await self._audit.log("refresh_token", request, user_id=user_id)
        return _make_token_pair(user.id)

    async def logout(self, dto: RefreshDTO, request: Request, current_user: User) -> dict:
        try:
            payload = jwt.decode(dto.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") == "refresh" and payload.get("sub") == current_user.id:
                await _blacklist.add(dto.refresh_token, ttl_seconds=REFRESH_TOKEN_DAYS * 86400)
        except JWTError:
            pass  # Token inválido al logout es inofensivo
        await self._audit.log("logout", request, user_id=current_user.id)
        return {"detail": "Sesión cerrada"}

    async def change_password(self, current_user: User, current_password: str, new_password: str) -> dict:
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
        from infrastructure.database.postgres.repositories.postgres_audit_log_repository import PostgresAuditLogRepository
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
