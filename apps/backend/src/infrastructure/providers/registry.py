from application.ports.i_financial_provider import IFinancialProvider
from .balanz.balanz_csv_provider import BalanzCSVProvider
from .binance.binance_provider import BinanceProvider
from .bullmarket.bullmarket_provider import BullMarketProvider
from .iol.iol_provider import IOLProvider
from .lemoncash.lemoncash_provider import LemonCashProvider
from .manual.manual_provider import ManualProvider
from .mercadopago.mercadopago_provider import MercadoPagoProvider
from .onchain.onchain_provider import OnChainProvider
from .solana.solana_provider import SolanaProvider


class ProviderRegistry:
    """Único lugar donde se registran los providers disponibles."""

    _providers: dict[str, type] = {
        "binance": BinanceProvider,
        "mercadopago": MercadoPagoProvider,
        "bullmarket": BullMarketProvider,
        "lemoncash": LemonCashProvider,
        "iol": IOLProvider,
        "onchain": OnChainProvider,
        "solana": SolanaProvider,
        "balanz_csv": BalanzCSVProvider,
        "manual": ManualProvider,
    }

    def get(self, provider_type: str, credentials: dict) -> IFinancialProvider:
        provider_class = self._providers.get(provider_type)
        if not provider_class:
            raise ValueError(f"Provider desconocido: {provider_type}")
        return provider_class(**credentials)

    def available_providers(self) -> list[str]:
        return list(self._providers.keys())
