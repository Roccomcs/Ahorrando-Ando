from application.dtos.auth.login_dto import TokenDTO


class RefreshToken:
    def execute(self, user_id: str, create_token_fn) -> TokenDTO:
        token = create_token_fn({"sub": user_id})
        return TokenDTO(access_token=token)
