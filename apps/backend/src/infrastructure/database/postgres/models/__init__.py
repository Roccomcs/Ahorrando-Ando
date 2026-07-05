# Importar todos los modelos para que SQLAlchemy registre las FK correctamente
from infrastructure.database.postgres.models.user_model import UserModel
from infrastructure.database.postgres.models.integration_model import IntegrationModel
from infrastructure.database.postgres.models.portfolio_snapshot_model import PortfolioSnapshotModel
from infrastructure.database.postgres.models.provider_snapshot_model import ProviderSnapshotModel
from infrastructure.database.postgres.models.audit_log_model import AuditLogModel
from infrastructure.database.postgres.models.price_alert_model import PriceAlertModel
from infrastructure.database.postgres.models.push_subscription_model import PushSubscriptionModel
from infrastructure.database.postgres.models.transaction_model import TransactionModel

__all__ = [
    "TransactionModel",
    "UserModel",
    "IntegrationModel",
    "PortfolioSnapshotModel",
    "ProviderSnapshotModel",
    "AuditLogModel",
    "PriceAlertModel",
    "PushSubscriptionModel",
]
