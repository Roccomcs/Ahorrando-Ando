from typing import TypedDict


class BinanceBalance(TypedDict):
    asset: str
    free: str
    locked: str


class BinanceAccountInfo(TypedDict):
    totalAssetOfBtc: str
    balances: list[BinanceBalance]
