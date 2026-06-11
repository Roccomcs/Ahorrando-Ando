from dataclasses import dataclass


@dataclass(frozen=True)
class Percentage:
    value: float

    def __post_init__(self):
        if not (-100 <= self.value <= 100):
            raise ValueError("El porcentaje debe estar entre -100 y 100")
