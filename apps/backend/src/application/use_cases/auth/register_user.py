import uuid
from datetime import datetime, timezone

from application.dtos.auth.register_dto import RegisterDTO
from domain.entities.user import User
from domain.repositories.i_user_repository import IUserRepository


# Caso de uso para registrar un nuevo usuario. Verifica si el email ya está registrado, maneja cuentas no verificadas y crea un nuevo usuario en la base de datos.
class RegisterUser:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._repo = user_repo

    async def execute(self, dto: RegisterDTO, hashed_password: str) -> User:
        existing = await self._repo.find_by_email(dto.email)

        if existing:
            if existing.email_verified:
                raise ValueError("Este email ya está registrado. Iniciá sesión.")

            # Cuenta creada pero nunca verificada: permitir reintentar el registro.
            # Se actualiza la contraseña y el controller reenvía el código, para
            # que la cuenta no quede trabada si el primer email nunca llegó.
            if existing.hashed_password is not None:
                await self._repo.update_password(existing.id, hashed_password)
                return User(
                    id=existing.id,
                    email=existing.email,
                    hashed_password=hashed_password,
                    created_at=existing.created_at,
                    email_verified=False,
                    google_id=existing.google_id,
                )

            # Cuenta creada con Google pero sin verificar (caso anómalo)
            raise ValueError("Este email está asociado a una cuenta de Google. Usá 'Continuar con Google'.")

        user = User(
            id=str(uuid.uuid4()),
            email=dto.email,
            hashed_password=hashed_password,
            created_at=datetime.now(timezone.utc),
        )
        return await self._repo.save(user)
