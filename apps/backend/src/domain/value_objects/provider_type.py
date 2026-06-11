from enum import Enum


class ProviderType(str, Enum):
    BINANCE = "binance"
    MERCADOPAGO = "mercadopago"
    BULLMARKET = "bullmarket"
    LEMONCASH = "lemoncash"
    IOL = "iol"
    ONCHAIN = "onchain"
    SOLANA = "solana"
    BALANZ_CSV = "balanz_csv"
    MANUAL = "manual"
