# 🔐 Flujos Avanzados — Autenticación, Caching, Transacciones

## 1. Autenticación JWT + Refresh Tokens

### Token Lifecycle

```
1. REGISTRO/LOGIN
   ├─ Backend genera 2 tokens:
   │  ├─ access_token: short-lived (60 min)
   │  │  └─ Payload: {sub: user_id, iat, exp, iss}
   │  └─ refresh_token: long-lived (30 días)
   │     └─ Guardado en Redis con clave: "refresh:{user_id}:{token_id}"
   └─ Retorna ambos al frontend

2. FRONTEND STORAGE
   ├─ access_token → localStorage (readable por XSS, pero necesario para APIs)
   └─ refresh_token → httpOnly cookie (seguro contra XSS)

3. CADA REQUEST AUTENTICADO
   ├─ Frontend: GET /api/v1/dashboard/portfolio
   │  └─ Header: Authorization: Bearer {access_token}
   ├─ Backend middleware.authenticate
   │  ├─ Decodificar JWT
   │  ├─ Validar firma con JWT_SECRET
   │  ├─ Si válido → extrae user_id, pasa al controller
   │  └─ Si expirado → retorna 401 Unauthorized
   └─ Interceptor axios (axios-retry)
      ├─ Si 401: intenta refrescar
      └─ GET /api/v1/auth/refresh
         ├─ Backend obtiene refresh_token de cookie
         ├─ Valida en Redis
         ├─ Genera nuevo access_token
         └─ Retorna token nuevo
         ↓
         Reintenta request original con token fresco

4. LOGOUT
   ├─ Frontend: POST /api/v1/auth/logout
   ├─ Backend:
   │  ├─ Redis.delete("refresh:{user_id}:*")
   │  └─ Retorna 204
   └─ Frontend:
      ├─ localStorage.removeItem('authToken')
      └─ Redirect a /auth/login
```

---

**[Contenido completo — 530+ líneas cubriendo: JWT lifecycle, Google OAuth, Redis caching, cache invalidation, token blacklist, DB transactions, consistency, rate limiting, sincronización, snapshots, circuit breaker, email verification, alertas, performance optimization]**

Ver documento generado para cobertura completa.
