import json
import os

from cryptography.fernet import Fernet

from application.ports.i_encryption_service import IEncryptionService


class FernetEncryptionService(IEncryptionService):
    def __init__(self) -> None:
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            raise RuntimeError("ENCRYPTION_KEY no está configurada")
        self._fernet = Fernet(key.encode())

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> dict:
        decrypted = self._fernet.decrypt(ciphertext.encode()).decode()
        return json.loads(decrypted)
