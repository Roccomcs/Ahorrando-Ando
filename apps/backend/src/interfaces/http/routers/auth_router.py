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

router = APIRouter(prefix="/auth", tags=["Auth"])


class SendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


@router.post("/register", response_model=TokenDTO)
async def register(dto: RegisterDTO, request: Request, controller: AuthController = Depends()):
    return await controller.register(dto, request)


@router.post("/login", response_model=TokenDTO)
async def login(dto: LoginDTO, request: Request, controller: AuthController = Depends()):
    return await controller.login(dto, request)


@router.post("/send-verification")
async def send_verification(body: SendVerificationRequest, controller: AuthController = Depends()):
    return await controller.send_verification(body.email)


@router.post("/verify-email", response_model=TokenDTO)
async def verify_email(body: VerifyEmailRequest, controller: AuthController = Depends()):
    return await controller.verify_email(body.email, body.code)


@router.get("/google")
async def google_start(request: Request, controller: AuthController = Depends()):
    return await controller.google_start(request)


@router.get("/google/callback")
async def google_callback(code: str = Query(...), request: Request = None, controller: AuthController = Depends()):
    return await controller.google_callback(code, request)


@router.post("/refresh", response_model=TokenDTO)
async def refresh(dto: RefreshDTO, request: Request, controller: AuthController = Depends()):
    return await controller.refresh(dto, request)


@router.post("/logout")
async def logout(
    dto: RefreshDTO,
    request: Request,
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.logout(dto, request, current_user)


@router.get("/me", response_model=UserDTO)
async def me(
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.me(current_user)


@router.post("/change-password")
async def change_password(
    dto: ChangePasswordDTO,
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.change_password(current_user, dto.current_password, dto.new_password)


@router.delete("/me")
async def delete_account(
    confirm_email: str,
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.delete_account(current_user, confirm_email)


@router.get("/audit", response_model=list[AuditLogDTO])
async def audit_log(
    current_user: User = Depends(get_current_user),
    controller: AuthController = Depends(),
):
    return await controller.get_audit_log(current_user.id)
