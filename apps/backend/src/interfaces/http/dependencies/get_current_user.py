import os

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.user import User
from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository
from interfaces.http.dependencies.get_db_session import get_db_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"

_unauthorized = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Token inválido",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise _unauthorized
        user_id: str = payload.get("sub")
        if not user_id:
            raise _unauthorized
    except JWTError:
        raise _unauthorized

    user = await PostgresUserRepository(session).find_by_id(user_id)
    if not user:
        raise _unauthorized
    return user
