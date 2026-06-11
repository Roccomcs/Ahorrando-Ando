from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


# Tipos de activos IOL → etiqueta legible
_TIPO_LABEL = {
    "ACCIONES": "Acción",
    "BONOS": "Bono",
    "CEDEARS": "CEDEAR",
    "FCI": "FCI",
    "OPCIONES": "Opción",
    "ON": "ON",
}


class IOLHoldingsMapper:
    def map(self, portafolio: dict, ars_to_usd: float) -> list[Holding]:
        holdings = []
        activos = portafolio.get("activos", [])

        for activo in activos:
            cantidad = float(activo.get("cantidad", 0))
            if cantidad <= 0:
                continue

            simbolo = activo.get("titulo", {}).get("simbolo", "?")
            tipo_raw = activo.get("titulo", {}).get("tipo", "")
            nombre = f"{_TIPO_LABEL.get(tipo_raw, tipo_raw)} {simbolo}".strip()

            # Valorización en ARS → convertir a USD
            valor_ars = float(activo.get("valorizado", 0))
            valor_usd = valor_ars * ars_to_usd

            # Variación % (IOL la provee en algunos casos)
            variacion = float(activo.get("variacion", 0))
            pct_clamped = max(-100.0, min(100.0, variacion))

            holdings.append(
                Holding(
                    asset_name=nombre,
                    asset_symbol=simbolo,
                    amount=cantidad,
                    current_value=Money(amount=valor_usd, currency=Currency.USD),
                    performance_24h=Percentage(pct_clamped),
                    performance_30d=Percentage(0.0),
                )
            )
        return holdings
