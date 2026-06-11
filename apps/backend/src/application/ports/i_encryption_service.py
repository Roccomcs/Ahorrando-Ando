from abc import ABC, abstractmethod


class IEncryptionService(ABC):
    @abstractmethod
    def encrypt(self, plaintext: str) -> str: ...

    @abstractmethod
    def decrypt(self, ciphertext: str) -> dict: ...
