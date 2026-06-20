from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserDTO(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime
    email_verified: bool = False
