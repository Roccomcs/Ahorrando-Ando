from abc import ABC, abstractmethod


class ITokenBlacklistService(ABC):
    @abstractmethod
    async def add(self, token: str, ttl_seconds: int) -> None:
        """Agrega un token a la blacklist con TTL en segundos."""

    @abstractmethod
    async def is_blacklisted(self, token: str) -> bool:
        """Retorna True si el token está en la blacklist."""
