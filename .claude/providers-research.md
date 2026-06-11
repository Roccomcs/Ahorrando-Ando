# Research de APIs de Providers

## Binance

**Documentación oficial**: https://binance-docs.github.io/apidocs/spot/en/

### Endpoints clave
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/v3/ping` | GET | No | Health check |
| `/api/v3/account` | GET | HMAC | Balances + info de cuenta |
| `/api/v3/ticker/price` | GET | No | Precio actual de un símbolo |
| `/api/v3/ticker/24hr` | GET | No | Stats 24h incluyendo % cambio |

### Autenticación
- Header: `X-MBX-APIKEY: <api_key>`
- Parámetro: `signature=HMAC_SHA256(secret, queryString + timestamp)`
- Siempre incluir `timestamp` en milisegundos

### Permisos necesarios
- Solo lectura ("Read Info") — nunca pedir permisos de trading

### Notas de implementación
- Rate limit: 1200 request weight/minuto
- `BinancePricesClient` debe usar `/api/v3/ticker/price?symbol=BTCUSDT`
- Para rendimiento 24h usar `/api/v3/ticker/24hr?symbol=BTCUSDT` → campo `priceChangePercent`

---

## MercadoPago

**Documentación oficial**: https://www.mercadopago.com.ar/developers/es/reference

### Endpoints clave
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/v1/account/balance` | GET | Bearer | Balance de la cuenta |
| `/v1/users/me` | GET | Bearer | Info del usuario |

### Autenticación
- Header: `Authorization: Bearer <access_token>`
- Access token: OAuth2 o token de larga duración generado en el panel

### Productos financieros
- **Billetera**: saldo en ARS disponible
- **Mercado Fondo**: fondo money market (si el usuario tiene)
- Las inversiones en FCI no tienen endpoint público documentado — puede requerir scraping o acceso especial

### Notas de implementación
- El tipo de cambio ARS/USD no es provisto por MP — necesita fuente externa
- Considerar `dolarito.ar` API para tipo de cambio blue/oficial
- Los saldos vienen en centavos en algunas respuestas — verificar

---

## BullMarket Brokers

**Estado**: API no documentada públicamente

### Opciones de integración
1. **API privada**: BullMarket tiene una app móvil — puede tener API REST interna
   - Capturar con proxy (mitmproxy) para analizar endpoints
   - Riesgo: puede cambiar sin aviso, violación de ToS potencial

2. **Web scraping**: Login en https://bullmarket.com.ar + scraping de portfolio
   - Herramienta: Playwright async
   - Más frágil pero funcional

3. **Exportación manual CSV**: el usuario sube un CSV exportado desde la plataforma
   - Más simple de implementar, menos automatizado
   - Buen fallback mientras se investiga la API

### Recomendación
Implementar primero importación CSV (Fase 3.3 puede ser más adelante).
El `BullMarketProvider` actual es un placeholder hasta confirmar la estrategia.

---

## CoinGecko (Price Service)

**Documentación**: https://www.coingecko.com/en/api/documentation

### Endpoint principal
`GET /api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd`

### Mapeo de símbolos Binance → CoinGecko IDs
El problema: Binance usa `BTC`, CoinGecko usa `bitcoin`.
Necesita tabla de mapeo o endpoint de búsqueda:
`GET /api/v3/coins/list` → lista completa de `{id, symbol, name}`

### Rate limits (free tier)
- 30 calls/minuto
- Usar caché agresivo (mínimo 5 minutos por precio)

---

## Tipo de cambio ARS/USD

### Opciones
| Fuente | URL | Tipo | Confiabilidad |
|--------|-----|------|---------------|
| dolarito.ar | `https://dolarito.ar/api/frontend/oficial` | Oficial/Blue/MEP | Alta, actualizado |
| BCRA | API oficial del banco central | Oficial | Oficial pero lento |
| bluelytics | `https://api.bluelytics.com.ar/v2/latest` | Oficial/Blue | Alta |

### Recomendación
Usar **bluelytics** para el dólar blue y oficial.
Cachear el tipo de cambio por 30 minutos.
