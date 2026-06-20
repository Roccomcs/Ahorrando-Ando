import re

from pydantic import BaseModel, EmailStr, field_validator

_COMMON_PASSWORDS = {
    "password1", "12345678", "123456789", "qwerty123", "iloveyou1",
    "admin1234", "welcome1", "monkey123", "dragon123", "master123",
}


class RegisterDTO(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 12:
            raise ValueError("La contraseña debe tener al menos 12 caracteres")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("La contraseña debe contener al menos una letra")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe contener al menos un número")
        if v.lower() in _COMMON_PASSWORDS:
            raise ValueError("Esa contraseña es demasiado común. Elegí una más segura")
        return v
