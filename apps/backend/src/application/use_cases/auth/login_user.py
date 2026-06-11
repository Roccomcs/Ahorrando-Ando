from application.dtos.auth.login_dto import LoginDTO, TokenDTO
from domain.repositories.i_user_repository import IUserRepository


class LoginUser:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._repo = user_repo

    async def execute(
        self,
        dto: LoginDTO,
        verify_password_fn,
        create_token_fn,
    ) -> TokenDTO:
        user = await self._repo.find_by_email(dto.email)
        if not user or not verify_password_fn(dto.password, user.hashed_password):
            raise ValueError("Credenciales inválidas")

        access_token, refresh_token = create_token_fn({"sub": user.id})
        return TokenDTO(access_token=access_token, refresh_token=refresh_token)
