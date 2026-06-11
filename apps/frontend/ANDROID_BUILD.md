# Generar APK de Android

## Requisitos previos

1. **Android Studio** — Descargar desde https://developer.android.com/studio
   - Durante la instalación, aceptar el Android SDK (API 34 o superior)
   - Tener al menos 8GB de espacio libre

2. **Java 17+** — Android Studio lo instala automáticamente

3. **Node.js 18+** — Ya lo tenés

---

## Paso 1 — Configurar la URL del backend

Editá el archivo `.env.production` y reemplazá la URL placeholder:

```
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

---

## Paso 2 — Instalar dependencias de Capacitor

```bash
cd apps/frontend
npm install
```

---

## Paso 3 — Inicializar el proyecto Android (solo la primera vez)

```bash
cd apps/frontend
npx cap add android
```

Esto crea la carpeta `android/` con el proyecto de Android Studio.

---

## Paso 4 — Build y sincronizar

```bash
npm run build:android
```

Este comando hace dos cosas:
1. `next build` — genera la carpeta `out/` con el export estático
2. `npx cap sync android` — copia los archivos a la carpeta `android/`

---

## Paso 5 — Generar el APK en Android Studio

1. Abrí Android Studio
2. Elegí "Open" y seleccioná la carpeta `apps/frontend/android/`
3. Esperá que Gradle sincronice (puede tardar unos minutos la primera vez)
4. En el menú: **Build → Generate Signed App Bundle / APK**
5. Elegí **APK**
6. Si no tenés un keystore:
   - Click en "Create new..."
   - Completá los datos (guardá bien la contraseña, la vas a necesitar para futuras actualizaciones)
7. Elegí **release** como build variant
8. Click en **Finish**

El APK se genera en:
```
android/app/release/app-release.apk
```

---

## Paso 6 — Copiar el APK a la landing page

```bash
cp android/app/release/app-release.apk ../landing/assets/ahorrando-ando.apk
```

---

## Paso 7 — Instalar en Android (para testear)

**Opción A — Directo por USB:**
```bash
npx cap run android
```
(El teléfono tiene que tener "Depuración USB" activada en Opciones de desarrollador)

**Opción B — Compartir el APK:**
- Subí el archivo `ahorrando-ando.apk` a Google Drive o WhatsApp
- Abrilo desde el teléfono
- Aceptar "Instalar desde fuentes desconocidas" cuando lo pida

---

## Actualizar la app

Cuando hagas cambios en el frontend:

```bash
npm run build:android
```

Luego abrí Android Studio y generá el APK nuevamente (Paso 5).

---

## Troubleshooting

**"SDK not found"** → Abrí Android Studio, ir a SDK Manager y instalar Android SDK API 34.

**"Gradle sync failed"** → File → Invalidate Caches → Restart.

**La app se ve en blanco** → Verificá que `.env.production` tiene la URL correcta del backend y que el backend está corriendo.

**CORS error en Android** → Asegurate de que el backend en producción tenga `ALLOWED_ORIGINS` con la URL correcta o `*` para development.
