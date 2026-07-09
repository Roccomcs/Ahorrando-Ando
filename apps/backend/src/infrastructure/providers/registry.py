from application.ports.i_financial_provider import IFinancialProvider
from .binance.binance_provider import BinanceProvider
from .iol.iol_csv_provider import IOLCSVProvider
from .manual.manual_provider import ManualProvider
from .mercadopago.mercadopago_provider import MercadoPagoProvider


class ProviderRegistry:
    """Único lugar donde se registran los providers disponibles."""

    _providers: dict[str, type] = {
        "binance": BinanceProvider,
        "mercadopago": MercadoPagoProvider,
        "iol_csv": IOLCSVProvider,
        "manual": ManualProvider,
    }

    def get(self, provider_type: str, credentials: dict) -> IFinancialProvider:
        provider_class = self._providers.get(provider_type)
        if not provider_class:
            raise ValueError(f"Provider desconocido: {provider_type}")
        return provider_class(**credentials)

    def available_providers(self) -> list[str]:
        return list(self._providers.keys())
