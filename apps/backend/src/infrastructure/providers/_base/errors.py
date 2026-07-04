class ProviderAuthError(Exception):
    """Error de autenticación de un provider con mensaje apto para el usuario.

    Los use cases pueden mostrar `str(error)` directamente sin envolverlo.
    """
