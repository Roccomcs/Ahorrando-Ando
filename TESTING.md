# Checklist de Testing — Ahorrando Ando

Antes de empezar, corré la migración nueva:
```bash
PYTHONPATH=src .venv/Scripts/alembic upgrade head
```

---

## 1. Autenticación

- [ ] **Registro** — Ir a `/register`, completar email + contraseña + repetir contraseña. Verificar que el botón del ojo muestra/oculta la contraseña. Verificar que si las contraseñas no coinciden aparece el mensaje de error en rojo debajo del campo. Crear cuenta con un email nuevo.
- [ ] **Validación de contraseña corta** — Intentar registrarse con una contraseña de menos de 8 caracteres. Debe mostrar error antes de hacer el request.
- [ ] **Email ya registrado** — Intentar registrarse con `admin@local.dev`. Debe aparecer "El email ya está registrado".
- [ ] **Login correcto** — Iniciar sesión con `admin@local.dev` / `password123`. Debe redirigir al dashboard.
- [ ] **Login incorrecto** — Usar contraseña incorrecta. Debe mostrar "Credenciales inválidas".
- [ ] **Logout** — Hacer click en cerrar sesión desde el sidebar. Debe redirigir al login y no poder volver al dashboard sin loguearse.
- [ ] **Persistencia de sesión** — Loguearse, cerrar la pestaña, volver a `localhost:3000`. Debe entrar directo al dashboard sin pedir login.

---

## 2. Dashboard

- [ ] **Estado vacío (onboarding)** — Sin integraciones configuradas, el dashboard debe mostrar una pantalla de bienvenida con botón para agregar cuenta (no un error ni pantalla en blanco).
- [ ] **Navegación del sidebar** — Hacer click en cada ítem del menú (Dashboard, Performance, Historial, Analytics, Integraciones, Alertas, Configuración). Todos deben cargar sin error.

---

## 3. Integraciones

- [ ] **Wizard paso 1** — Ir a `/integrations`, hacer click en cualquier provider. Debe abrir el modal con las instrucciones numeradas y el link externo.
- [ ] **Wizard paso 2** — Avanzar al paso 2. Debe mostrar el formulario de credenciales correspondiente al provider elegido.
- [ ] **Agregar cuenta Manual** — Elegir el provider "Manual", completar el formulario con holdings inventados (ej: BTC 0.5, USD 1000). Guardar. Debe aparecer la integración como "conectada" en la grilla.
- [ ] **Dashboard con datos** — Después de agregar la cuenta Manual, volver al Dashboard. Debe mostrar el donut chart y la tabla con los holdings cargados.
- [ ] **Eliminar integración** — Desde la página de Integraciones, eliminar la integración creada. Confirmar que desaparece de la grilla.
- [ ] **Credenciales inválidas** — Intentar agregar Binance con API key inventada. Debe mostrar error descriptivo (no pantalla en blanco).

---

## 4. Performance

- [ ] **Página vacía** — Sin datos históricos, `/performance` debe mostrar un estado vacío legible, no un error.
- [ ] **Después de agregar integración** — Con la cuenta Manual activa, verificar que aparecen los datos en la tabla resumen.
- [ ] **Selector de período** — Cambiar entre 7d / 30d / 90d / 1 año. Las tarjetas y gráficos deben actualizarse.

---

## 5. Historial

- [ ] **Gráfico de evolución** — Ir a `/history`. Con datos cargados, debe mostrar la línea de evolución del portfolio.
- [ ] **Selector de rango** — Cambiar entre rangos (7d, 30d, 90d, 1 año). El gráfico debe ajustarse.
- [ ] **Estado vacío** — Sin integraciones, debe mostrar mensaje vacío en lugar de gráfico roto.

---

## 6. Analytics

- [ ] **Gráficos de allocation** — Ir a `/analytics`. Verificar que carga el pie chart de distribución por asset, por provider y por tipo.
- [ ] **Tabla ROI** — Verificar que la tabla de retorno por activo se muestra (aunque esté vacía si no hay datos históricos suficientes).
- [ ] **Benchmark** — Verificar que la comparativa BTC/ETH vs portfolio carga sin error.

---

## 7. Alertas de Precio

- [ ] **Crear alerta** — Ir a `/alerts`, crear una alerta (ej: BTC por encima de USD 50.000). Debe aparecer en la lista de alertas activas.
- [ ] **Eliminar alerta** — Eliminar la alerta recién creada. Debe desaparecer de la lista.
- [ ] **Validación** — Intentar crear una alerta sin completar todos los campos. Debe bloquear el envío.

---

## 8. Configuración

- [ ] **Cambio de contraseña** — Ir a `/settings`, cambiar la contraseña. Luego hacer logout y volver a loguearse con la contraseña nueva.
- [ ] **Historial de acceso** — Verificar que en Settings aparece el log de logins realizados en esta sesión.
- [ ] **Eliminar cuenta** — (Opcional, crear una cuenta de prueba primero) Verificar que el flujo de eliminación de cuenta pide confirmación con email y funciona.

---

## 9. Responsividad

- [ ] **Mobile** — Abrir DevTools (F12), activar vista móvil (375px). Verificar que el sidebar se oculta/transforma en menú hamburguesa, y que el dashboard, integraciones y settings son usables en pantalla chica.
- [ ] **Tablet** — Probar en ~768px. Las grillas deben reorganizarse correctamente.

---

## 10. Rate Limiting (nuevo)

- [ ] **Brute force bloqueado** — Intentar hacer login con contraseña incorrecta más de 20 veces seguidas desde el browser. En el request 21+ debe recibir error 429 "Demasiadas solicitudes".

---

## Qué reportarme por cada bug

Para cada cosa que no funcione, pasame:
1. En qué página/acción estaba
2. Qué esperabas que pasara
3. Qué pasó en realidad (error en pantalla o en la consola del browser F12 → Console)
