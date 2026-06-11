from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.postgres.connection import AsyncSessionFactory


async def get_db_session() -> AsyncSession:
    async with AsyncSessionFactory() as session:
        yield session
