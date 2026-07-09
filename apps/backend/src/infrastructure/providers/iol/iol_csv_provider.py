"""
Provider para la cartera importada del export de operaciones de IOL.

Reutiliza toda la lógica de precios en vivo de ManualProvider (data912 para
CEDEARs/acciones/bonos AR, CoinGecko para cripto, FX para efectivo, con fallback
al price_usd guardado). Solo cambia el nombre y el provider_type.

Credenciales: {institution_name, holdings: [{symbol, name, amount, category, ref, price_usd}]}
"""

from infrastructure.providers.manual.manual_provider import ManualProvider


class IOLCSVProvider(ManualProvider):
    def __init__(self, institution_name: str = "Invertir Online", holdings: list | None = None) -> None:
        super().__init__(institution_name or "Invertir Online", holdings or [])

    @property
    def name(self) -> str:
        return "Invertir Online"

    @property
    def provider_type(self) -> str:
        return "iol_csv"
