# Arquitectura — Ahorrando Ando Backend

## Principio rector: Arquitectura Hexagonal (Ports & Adapters)

```
Request HTTP
    │
    ▼
[interfaces/http]        ← Capa de entrada: routers, controllers, middlewares
    │
    ▼
[application]            ← Casos de uso + DTOs + puertos (interfaces)
    │
    ▼
[domain]                 ← Entidades, value objects, interfaces de repos (sin deps)
    ▲
    │
[infrastructure]         ← Implementaciones: postgres, redis, providers, fernet
```

## Flujo de un request típico

```
GET /api/v1/dashboard/
  → get_current_user (Depends) verifica JWT → extrae user_id
  → DashboardController.get_aggregated(user_id)
  → GetAggregatedPortfolio.execute(user_id)
      → cache.get("portfolio:{user_id}") → hit? devuelve
      → integration_repo.find_by_user(user_id)
      → asyncio.gather([provider.get_holdings() for each integration])
      → PortfolioSummaryDTO.aggregate(results)
      → cache.set(...)
  → JSON response
```

## Reglas de dependencia (nunca violar)

| Capa          | Puede importar de        | NUNCA importa de          |
|---------------|--------------------------|---------------------------|
| domain        | (nada externo)           | application, infrastructure, interfaces |
| application   | domain                   | infrastructure, interfaces |
| infrastructure| domain, application      | interfaces                |
| interfaces    | todos                    | —                         |

## Cómo agregar un nuevo provider

1. Crear carpeta `src/infrastructure/providers/<nombre>/`
2. Implementar `<nombre>_provider.py` que extiende `IFinancialProvider`
3. Registrar en `registry.py`: `"nombre": NombreProvider`
4. Agregar valor al enum `ProviderType` en `domain/value_objects/provider_type.py`

No hay ningún otro lugar que tocar.

## Decisiones de diseño

- **Dataclasses frozen** en domain: inmutabilidad garantizada, sin bugs de estado compartido
- **Pydantic en application/DTOs**: validación automática en endpoints FastAPI
- **asyncio.gather en GetAggregatedPortfolio**: todas las integraciones se consultan en paralelo
- **return_exceptions=True**: un provider caído no rompe el portfolio completo
- **Cache TTL 5 min**: balance entre frescura de datos y carga en APIs externas
- **Fernet para credenciales**: encriptación simétrica determinista, fácil rotación de key
