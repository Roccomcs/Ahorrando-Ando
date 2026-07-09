from typing import Literal

from pydantic import BaseModel

AssetCategory = Literal["crypto", "stock", "cedear", "bond", "fx"]


class AssetSearchResultDTO(BaseModel):
    symbol: str            # símbolo visible (ej: "BTC", "AAPL", "GGAL", "USD")
    name: str              # nombre legible
    category: AssetCategory
    ref: str               # identificador para cotizar (coingecko_id o símbolo AR)
    price_usd: float       # precio actual en USD (0 si no se pudo cotizar)
    logo_url: str | None = None  # logo del activo (cripto vía CoinGecko; None = monograma)
