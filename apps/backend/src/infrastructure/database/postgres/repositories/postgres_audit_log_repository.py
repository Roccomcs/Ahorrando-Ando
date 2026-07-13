import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.audit_log import AuditLog
from domain.repositories.i_audit_log_repository import IAuditLogRepository
from infrastructure.database.postgres.models.audit_log_model import AuditLogModel


# Implementación PostgreSQL del repositorio de audit logs. Registra cada acción relevante del usuario (login, registro, logout, etc.)
class PostgresAuditLogRepository(IAuditLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Inserta un nuevo registro de auditoría en la BD
    async def save(self, log: AuditLog) -> None:
        model = AuditLogModel(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            extra_data=json.dumps(log.metadata) if log.metadata else None,
            created_at=log.created_at,
        )
        self._session.add(model)
        await self._session.commit()

    # Trae los últimos N registros de auditoría del usuario, opcionalmente filtrados por fecha
    async def find_by_user(
        self,
        user_id: str,
        limit: int = 50,
        since: datetime | None = None,
    ) -> list[AuditLog]:
        stmt = (
            select(AuditLogModel)
            .where(AuditLogModel.user_id == user_id)
            .order_by(AuditLogModel.created_at.desc())
            .limit(limit)
        )
        if since:
            stmt = stmt.where(AuditLogModel.created_at >= since)

        result = await self._session.execute(stmt)
        rows = result.scalars().all()
        return [_to_entity(r) for r in rows]


# Convierte el modelo SQLAlchemy (AuditLogModel) a la entidad del dominio (AuditLog)
def _to_entity(m: AuditLogModel) -> AuditLog:
    return AuditLog(
        id=m.id,
        user_id=m.user_id,
        action=m.action,
        ip_address=m.ip_address,
        user_agent=m.user_agent,
        metadata=json.loads(m.extra_data) if m.extra_data else {},
        created_at=m.created_at,
    )
