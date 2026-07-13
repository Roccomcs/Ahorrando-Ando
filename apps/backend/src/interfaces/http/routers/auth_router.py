from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, EmailStr

from application.dtos.auth.audit_log_dto import AuditLogDTO
from application.dtos.auth.change_password_dto import ChangePasswordDTO
from application.dtos.auth.login_dto import LoginDTO, RefreshDTO, TokenDTO
from application.dtos.auth.register_dto import RegisterDTO
from application.dtos.auth.user_dto import UserDTO
from domain.entities.user import User
from interfaces.http.controllers.auth_controller import AuthController
from interfaces.http.dependencies.get_current_user import get_current_user

# Archivo que define todos los endpoints relacionados con la autenticación y autorización de usuarios.
#  incluyendo registro, login, verificación de email, recuperación de contraseña, integración con Google OAuth2, y manejo de tokens JWT. 
# Cada endpoint delega la lógica al AuthController correspondiente.

router = APIRouter(prefix="/auth", tags=["Auth"])

# DTO para solicitud de verificación de email sin código (envía un email con código)
class SendVerificationRequest(BaseModel):
    email: EmailStr

# DTO para solicitud de verificación de email con código (verifica el código enviado al email)
class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

# DTO para solicitud de recuperación de contraseña (envía un email con código)
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# DTO para solicitud de restablecimiento de contraseña (verifica el código y establece nueva contraseña)
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


# Endpoints de autenticación y autorización

# Endpoint para registrar un nuevo usuario. Recibe un RegisterDTO y devuelve un TokenDTO.
@router.post("/register", response_model=TokenDTO)
async def register(dto: RegisterDTO, request: Request, controller: AuthController = Depends()):
    return await controller.register(dto, request)

# Endpoint para iniciar sesión. Recibe un LoginDTO y devuelve un TokenDTO.
@router.post("/login", response_model=TokenDTO)
async def login(dto: LoginDTO, request: Request, controller: AuthController = Depends()):
    return await controller.login(dto, request)

# Endpoint para enviar un email de verificación. Recibe un SendVerificationRequest y devuelve un mensaje de éxito.
@router.post("/send-verification")
async def send_verification(body: SendVerificationRequest, controller: AuthController = Depends()):
    return await controller.send_verification(body.email)

# Endpoint para verificar el email con un código. Recibe un VerifyEmailRequest y devuelve un TokenDTO.
@router.post("/verify-email", response_model=TokenDTO)
async def verify_email(body: VerifyEmailRequest, controller: AuthController = Depends()):
    return await controller.verify_email(body.email, body.code)

# Endpoint para solicitar recuperación de contraseña. Recibe un ForgotPasswordRequest y devuelve un mensaje de éxito.
@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, controller: AuthController = Depends()):
    return await controller.forgot_password(body.email)

# Endpoint para restablecer la contraseña con un código. Recibe un ResetPasswordRequest y devuelve un TokenDTO.
@router.post("/reset-password", response_model=TokenDTO)
async def reset_password(body: ResetPasswordRequest, controller: AuthController = Depends()):
    return await controller.reset_password(body.email, body.code, body.new_password)

# Endpoint para iniciar el flujo de autenticación con Google OAuth2. Redirige al usuario a la página de login de Google.
@router.get("/google")
async def google_start(request: Request, controller: AuthController = Depends()):
    return await controller.google_start(request)

# Endpoint para manejar el callback de Google OAuth2. Recibe un código de autorización y devuelve un TokenDTO.
@router.get("/google/callback")
async def google_callback(code: str = Query(...), request: Request = None, controller: AuthController = Depends()):
    return await controller.google_callback(code, request)

# Endpoint para refrescar el token de acceso. Recibe un RefreshDTO y devuelve un TokenDTO.
@router.post("/refresh", response_model=TokenDTO)
async def refresh(dto: RefreshDTO, request: Request, controller: AuthController = Depends()):
    return await controller.refresh(dto, request)

# Endpoint para cerrar sesión. Recibe un RefreshDTO y devuelve un mensaje de éxito. Requiere autenticación.
@router.post("/logout")
async def logout(
    dto: RefreshDTO,
    request: Request,
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.logout(dto, request, current_user)

# Endpoint para obtener información del usuario actual. Devuelve un UserDTO. Requiere autenticación.
@router.get("/me", response_model=UserDTO)
async def me(
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.me(current_user)

# Endpoint para cambiar la contraseña del usuario actual. Recibe un ChangePasswordDTO y devuelve un mensaje de éxito. Requiere autenticación.
@router.post("/change-password")
async def change_password(
    dto: ChangePasswordDTO,
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.change_password(current_user, dto.current_password, dto.new_password)

# Endpoint para eliminar la cuenta del usuario actual. Recibe un email de confirmación y devuelve un mensaje de éxito. Requiere autenticación.
@router.delete("/me")
async def delete_account(
    confirm_email: str,
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.delete_account(current_user, confirm_email)

# Endpoint para obtener el historial de auditoría del usuario actual. Devuelve una lista de AuditLogDTO. Requiere autenticación.
@router.get("/audit", response_model=list[AuditLogDTO])
async def audit_log(
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.get_audit_log(current_user.id)
