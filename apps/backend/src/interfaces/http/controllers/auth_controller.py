import asyncio
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
from infrastructure.cache.redis_verification_service import MAX_ATTEMPTS, RedisVerificationService
from infrastructure.database.postgres.repositories.postgres_audit_log_repository import PostgresAuditLogRepository
from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository
from infrastructure.services.email_service import EmailService
from interfaces.http.dependencies.get_db_session import get_db_session

 # Controlador de autenticación y autorización. Maneja el registro, login, verificación de email, recuperación de contraseña, integración con Google OAuth2, y manejo de tokens JWT. 
 # Cada método corresponde a un endpoint en auth_router.py y delega la lógica a los casos de uso correspondientes.

# logger para registrar eventos y errores relacionados con la autenticación y autorización.
logger = logging.getLogger(__name__)

# Configuración de JWT y servicios auxiliares
SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60
REFRESH_TOKEN_DAYS = 30
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Blacklist para revocar tokens.
_blacklist = RedisTokenBlacklistService()

# Servicio para enviar emails.
_email_svc = EmailService()

# Servicio para manejar códigos de verificación y reseteo de contraseña.
_verify_svc = RedisVerificationService(namespace="email_verify")
_reset_svc = RedisVerificationService(namespace="pwd_reset")

# --------------------------- FUNCIONES AUXILIARES ---------------------------

# Función para hashear una contraseña usando bcrypt. Devuelve la contraseña hasheada como string.
def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# Función para verificar una contraseña en texto plano contra un hash bcrypt. Devuelve True si coinciden, False en caso contrario.
def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# Función para crear un token de acceso JWT. Incluye el ID del usuario, el tipo de token y la fecha de expiración.
def _create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode({"sub": user_id, "type": "access", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

# Función para crear un token de refresh JWT. Incluye el ID del usuario, el tipo de token y la fecha de expiración.
def _create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)
    return jwt.encode({"sub": user_id, "type": "refresh", "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

# Función para crear un par de tokens (access y refresh) para un usuario dado. Devuelve un TokenDTO con ambos tokens.
def _make_token_pair(user_id: str) -> TokenDTO:
    return TokenDTO(
        access_token=_create_access_token(user_id),
        refresh_token=_create_refresh_token(user_id),
    )

# Función para enviar un código de verificación por email. Se ejecuta en segundo plano y no propaga errores para no interrumpir el flujo de registro o login.
async def _deliver_verification_code(email: str) -> None:
    """Nunca propaga: que falle el SMTP no debe tumbar el registro ni filtrar si
    el email existe. El usuario siempre puede pedir un reenvío."""
    try:
        code = await _verify_svc.generate_and_store(email)
        if code is None:
            logger.info("Tope de reenvíos alcanzado para %s", email)
            return
        await _email_svc.send_verification_code(email, code)
    except Exception as exc:
        logger.error("No se pudo enviar el código de verificación a %s: %s", email, exc)


# Envio de emails en segundo plano para no bloquear la respuesta HTTP. Se mantiene un set de tareas pendientes para evitar que se pierdan si la app se cierra.
_pending_emails: set[asyncio.Task] = set()

def _send_verification_code(email: str) -> None:
    """Dispara el envío en segundo plano. El handshake TLS con Gmail se lleva
    varios segundos y no hay razón para que el usuario los espere mirando un
    botón en 'Creando cuenta…'."""
    task = asyncio.create_task(_deliver_verification_code(email))
    _pending_emails.add(task)
    task.add_done_callback(_pending_emails.discard)

# ---------------------------- CONTROLADOR DE AUTENTICACIÓN ---------------------------

class AuthController:

    # FastAPI automáticamente:
    # 1. Crea una sesión de base de datos (AsyncSession) usando la dependencia get_db_session.
    # 2. Inyecta la sesión en el constructor del controlador.
    # 3. El controller crea un repositorio (acceso a BD) y un audit service
    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self._session = session
        self._repo = PostgresUserRepository(session)
        self._audit = AuditService(PostgresAuditLogRepository(session))

    # Registra un nuevo usuario. Recibe un RegisterDTO y devuelve un TokenDTO con los tokens de acceso y refresh. También envía un email de verificación.
    async def register(self, dto: RegisterDTO, request: Request) -> TokenDTO:

        # Crea una instancia del caso de uso
        use_case = RegisterUser(self._repo)

        # Hashea la contraseña
        hashed = _hash_password(dto.password)

        # Llama a use_case.execute que crea el usuario en la BDD
        user = await use_case.execute(dto, hashed)

        # Registra el evento en audit log
        await self._audit.log("register", request, user_id=user.id, metadata={"email": dto.email})

        # Enviar código de verificación en segundo plano
        _send_verification_code(dto.email)

        # Devuelve los tokens de acceso y refresh para el usuario recién registrado
        return _make_token_pair(user.id)

    # Inicia sesión para un usuario existente. Recibe un LoginDTO y devuelve un TokenDTO con los tokens de acceso y refresh.
    async def login(self, dto: LoginDTO, request: Request) -> TokenDTO:

        # Busca el usuario por email
        user = await self._repo.find_by_email(dto.email)

        # Si el usuario no existe, no tiene contraseña o la contraseña no coincide, se rechaza el acceso
        if not user or not user.hashed_password or not _verify_password(dto.password, user.hashed_password):
            await self._audit.log("login_failed", request, metadata={"email": dto.email})
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

        # Si el email todavía no está verificado, se reenvía el código y se corta el flujo
        if not user.email_verified:
            _send_verification_code(dto.email)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="email_not_verified",
            )

        # Registra el login exitoso y devuelve los tokens
        await self._audit.log("login", request, user_id=user.id)
        return _make_token_pair(user.id)

    # Devuelve el perfil del usuario autenticado como DTO.
    async def me(self, current_user: User) -> UserDTO:
        return UserDTO(
            id=current_user.id,
            email=current_user.email,
            created_at=current_user.created_at,
            email_verified=current_user.email_verified,
        )

    # Renueva un access token a partir de un refresh token válido.
    async def refresh(self, dto: RefreshDTO, request: Request) -> TokenDTO:

        # Construye la excepción estándar para cualquier refresh inválido
        invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")
        try:
            # Decodifica el JWT y valida que realmente sea un refresh token
            payload = jwt.decode(dto.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                raise invalid
            # Extrae el usuario asociado al token
            user_id: str = payload.get("sub")
            if not user_id:
                raise invalid
        except JWTError:
            raise invalid

        # Evita reutilizar refresh tokens ya revocados
        if await _blacklist.is_blacklisted(dto.refresh_token):
            raise invalid

        # Verifica que el usuario siga existiendo
        user = await self._repo.find_by_id(user_id)
        if not user:
            raise invalid

        # Revoca el refresh token usado, registra el evento y entrega un nuevo par
        await _blacklist.add(dto.refresh_token, ttl_seconds=REFRESH_TOKEN_DAYS * 86400)
        await self._audit.log("refresh_token", request, user_id=user_id)
        return _make_token_pair(user.id)

    # Cierra la sesión revocando el refresh token si pertenece al usuario autenticado.
    async def logout(self, dto: RefreshDTO, request: Request, current_user: User) -> dict:
        try:
            # Solo se revoca si el token es de tipo refresh y pertenece al usuario actual
            payload = jwt.decode(dto.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") == "refresh" and payload.get("sub") == current_user.id:
                await _blacklist.add(dto.refresh_token, ttl_seconds=REFRESH_TOKEN_DAYS * 86400)
        except JWTError:
            pass
        # Siempre registra el cierre de sesión
        await self._audit.log("logout", request, user_id=current_user.id)
        return {"detail": "Sesión cerrada"}

    # Envía un código de verificación de email sin revelar si el usuario existe.
    async def send_verification(self, email: str) -> dict:

        # Solo reenvía si existe la cuenta y todavía no está verificada
        user = await self._repo.find_by_email(email)

        # Respuesta idéntica tanto si el usuario existe como si no (evita enumeración)
        if user and not user.email_verified:
            _send_verification_code(email)
        return {"detail": "Si el email existe, recibirás un código"}

    # Verifica el email con el código recibido y devuelve tokens si el código es válido.
    async def verify_email(self, email: str, code: str) -> TokenDTO:

        # Busca el usuario para validar la verificación
        user = await self._repo.find_by_email(email)

        # Sin usuario no hay nada que verificar, pero se responde igual que con un
        # código equivocado para no revelar qué emails están registrados.
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "invalid_code", "attempts_left": MAX_ATTEMPTS - 1},
            )

        if user.email_verified:
            return _make_token_pair(user.id)

        # Valida el código y maneja el límite de intentos
        result = await _verify_svc.verify(email, code)
        if not result.ok:
            if result.attempts_left == 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={"code": "too_many_attempts"},
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "invalid_code", "attempts_left": result.attempts_left},
            )

        # Marca el email como verificado y entrega tokens
        await self._repo.mark_email_verified(user.id)
        return _make_token_pair(user.id)

    # Inicia el flujo OAuth de Google y redirige a la pantalla de autenticación.
    async def google_start(self, request: Request) -> RedirectResponse:

        # Sin credenciales configuradas, mandar a Google rompería con un error
        # críptico: volver al login con un mensaje claro.
        if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_REDIRECT_URI"):
            logger.error("Google OAuth no configurado: faltan GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI en .env")
            return RedirectResponse(f"{FRONTEND_URL}/login?error=oauth_unconfigured")
        
        # Genera el state y construye la URL de autorización
        state = secrets.token_urlsafe(16)
        url = build_google_auth_url(state)
        return RedirectResponse(url)

    # Procesa el callback de Google, crea o recupera el usuario y devuelve tokens al frontend.
    async def google_callback(self, code: str, request: Request) -> RedirectResponse:
        try:
            # Intercambia el code por el usuario autenticado
            use_case = HandleGoogleCallback(self._repo)
            user = await use_case.execute(code)

            # Registra el login con Google y genera los tokens
            await self._audit.log("login", request, user_id=user.id, metadata={"method": "google"})
            tokens = _make_token_pair(user.id)
            from urllib.parse import urlencode
            params = urlencode({"at": tokens.access_token, "rt": tokens.refresh_token})
            return RedirectResponse(f"{FRONTEND_URL}/api/auth/google/callback?{params}")
        except Exception as exc:
            logger.error("Google OAuth error: %s", exc)
            return RedirectResponse(f"{FRONTEND_URL}/login?error=oauth_failed")

    # Solicita un código para resetear la contraseña sin filtrar si el email existe.
    async def forgot_password(self, email: str) -> dict:
        
        # Solo envía el código si la cuenta existe y usa contraseña local
        user = await self._repo.find_by_email(email)
        if user and user.hashed_password:  # solo usuarios con contraseña (no Google-only)
            try:
                # Genera y envía el código de reset por email
                code = await _reset_svc.generate_and_store(email)
                if code is not None:
                    await _email_svc.send_password_reset_code(email, code)
            except Exception as exc:
                logger.error("Error enviando reset a %s: %s", email, exc)
        return {"detail": "Si el email existe, recibirás un código para resetear tu contraseña"}

    # Restablece la contraseña a partir del código recibido y devuelve nuevos tokens.
    async def reset_password(self, email: str, code: str, new_password: str) -> TokenDTO:
        # Busca el usuario asociado al email
        user = await self._repo.find_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido o expirado")

        # Valida el código antes de permitir el cambio de contraseña
        if not (await _reset_svc.verify(email, code)).ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido o expirado")

        # Hashea la nueva contraseña y la persiste
        hashed = _hash_password(new_password)
        await self._repo.update_password(user.id, hashed)
        # Si el email no estaba verificado, esta acción también lo verifica
        if not user.email_verified:
            await self._repo.mark_email_verified(user.id)
        return _make_token_pair(user.id)

    # Cambia la contraseña de la cuenta autenticada después de validar la actual.
    async def change_password(self, current_user: User, current_password: str, new_password: str) -> dict:
        if not current_user.hashed_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta cuenta usa Google. No podés cambiar la contraseña.")
        if not _verify_password(current_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contraseña actual incorrecta")
        # Guarda la nueva contraseña ya hasheada
        hashed = _hash_password(new_password)
        await self._repo.update_password(current_user.id, hashed)
        return {"detail": "Contraseña actualizada"}

    # Elimina la cuenta si el email de confirmación coincide con el del usuario autenticado.
    async def delete_account(self, current_user: User, confirm_email: str) -> dict:
        # Verifica que el email confirmado coincida con el del usuario
        if confirm_email.lower() != current_user.email.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email de confirmación no coincide")
        # Ejecuta el caso de uso de eliminación de cuenta
        from application.use_cases.auth.delete_account import DeleteAccount
        await DeleteAccount(self._session).execute(current_user.id)
        return {"detail": "Cuenta eliminada"}

    # Devuelve el historial de auditoría de un usuario como lista de DTOs.
    async def get_audit_log(self, user_id: str) -> list:
        from application.dtos.auth.audit_log_dto import AuditLogDTO
        # Consulta los registros y los transforma al formato de salida
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
