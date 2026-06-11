# Decisiones Técnicas — Registro de ADRs

## ADR-001: FastAPI sobre Django/Flask

**Fecha**: 2026-06-10  
**Estado**: Aceptado

**Contexto**: El backend necesita manejar múltiples llamadas a APIs financieras en paralelo.

**Decisión**: FastAPI con async/await nativo.

**Consecuencias**:
- `asyncio.gather` permite consultar Binance + MP + BullMarket en paralelo → latencia total = max(providers), no sum(providers)
- Pydantic v2 integrado elimina validación manual
- OpenAPI docs automáticas en `/docs`

---

## ADR-002: PostgreSQL sobre MongoDB

**Fecha**: 2026-06-10  
**Estado**: Aceptado

**Contexto**: Datos financieros (holdings, snapshots, usuarios).

**Decisión**: PostgreSQL con SQLAlchemy async.

**Razón**: Los datos financieros son relacionales por naturaleza (usuario → integración → snapshot). Las transacciones ACID son críticas. MongoDB agregaría complejidad sin beneficio real aquí.

---

## ADR-003: Fernet para encriptación de credenciales

**Fecha**: 2026-06-10  
**Estado**: Aceptado

**Contexto**: Las API keys de Binance, tokens de MP, etc. deben guardarse encriptadas.

**Decisión**: `cryptography.Fernet` — encriptación simétrica AES-128-CBC con HMAC-SHA256.

**Consecuencias**:
- Simple rotación de key: re-encriptar todos los registros con la nueva key
- La `ENCRYPTION_KEY` debe estar en variables de entorno (nunca en código)
- No usar para contraseñas de usuario (esas van con bcrypt en `passlib`)

---

## ADR-004: ProviderRegistry como punto único de registro

**Fecha**: 2026-06-10  
**Estado**: Aceptado

**Contexto**: Cómo agregar nuevos providers sin tocar múltiples archivos.

**Decisión**: Dict en `registry.py` mapea string → clase provider.

**Consecuencias**:
- Agregar Santander = 1 línea en `_providers` dict + crear la carpeta del provider
- El tipo `ProviderType` enum también debe actualizarse
- No hay factory pattern complejo, solo instanciación directa con `**credentials`

---

## ADR-005: return_exceptions=True en asyncio.gather

**Fecha**: 2026-06-10  
**Estado**: Aceptado

**Contexto**: Si Binance está caído, ¿el dashboard rompe para todos los providers?

**Decisión**: `asyncio.gather(*tasks, return_exceptions=True)` + filtrar las excepciones.

**Consecuencias**:
- El dashboard muestra los providers que responden aunque alguno falle
- Los errores se loguean pero no se propagan al usuario
- El response puede estar incompleto — documentar esto en el frontend

---

## ADR-006: Cache TTL de 5 minutos para portfolio

**Fecha**: 2026-06-10  
**Estado**: Aceptado

**Contexto**: Cada request al dashboard haría 3+ llamadas a APIs externas.

**Decisión**: Redis cache con TTL=300 segundos.

**Consecuencias**:
- El usuario puede ver datos con hasta 5 min de retraso
- `RefreshPortfolioData` use case invalida la caché manualmente (botón "refrescar")
- Reducción de carga en APIs externas en ~95% para usuarios que refrescan seguido
