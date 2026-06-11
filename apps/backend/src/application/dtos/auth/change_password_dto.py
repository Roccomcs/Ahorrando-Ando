from pydantic import BaseModel, Field


class ChangePasswordDTO(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
