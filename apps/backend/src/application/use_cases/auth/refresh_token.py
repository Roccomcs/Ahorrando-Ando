from application.dtos.auth.login_dto import TokenDTO


# Caso de uso para renovar el access token. Recibe el user_id (extraído del refresh token válido)
# y devuelve un nuevo access token sin volver a validar credenciales.
class RefreshToken:
    def execute(self, user_id: str, create_token_fn) -> TokenDTO:
        token = create_token_fn({"sub": user_id})
        return TokenDTO(access_token=token)
