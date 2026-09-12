# 💰 Ahorrando Ando

> Agregador de portafolios financieros para el mercado argentino que unifica exchanges, brokers y billeteras virtuales en una única plataforma en tiempo real.

[![Demo App](https://img.shields.io/badge/Demo-Vercel-black?style=flat-square&logo=vercel)](https://ahorrando-ando-tawny.vercel.app/)
[![License](https://img.shields.io/github/license/Roccomcs/Ahorrando-Ando?style=flat-square)](https://github.com/Roccomcs/Ahorrando-Ando/blob/main/LICENSE)
[![Issues](https://img.shields.io/github/issues/Roccomcs/Ahorrando-Ando?style=flat-square)](https://github.com/Roccomcs/Ahorrando-Ando/issues)
[![Stars](https://img.shields.io/github/stars/Roccomcs/Ahorrando-Ando?style=flat-square)](https://github.com/Roccomcs/Ahorrando-Ando/stargazers)

---

## 📌 Tabla de Contenidos

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura y Tecnologías](#-arquitectura-y-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso y Flujo de Trabajo](#-uso-y-flujo-de-trabajo)
- [Despliegue](#-despliegue)
- [Contribuciones](#-contribuciones)
- [Licencia](#-licencia)
- [Contacto](#-contacto)

---

## 📖 Acerca del Proyecto

**Ahorrando Ando** es un agregador de portafolios financieros centrado en el mercado argentino. Permite a los usuarios consolidar en un solo panel sus activos repartidos en múltiples plataformas (exchanges de criptomonedas, brokers de bolsa y billeteras virtuales), calculando y consolidando el patrimonio neto valuado en **ARS** y **USD** en tiempo real.

---

## ✨ Características Principales

* 🌐 **Consolidación de Patrimonio:** Reúne balances de exchanges, brokers y billeteras virtuales en una única pantalla.
* 💱 **Valuación Multimoneda en Tiempo Real:** Cálculo automático del patrimonio consolidado en pesos argentinos (ARS) y dólares (USD).
* 🔒 **Integración Segura (Read-Only):** Conexión mediante lectura segura (APIs/OAuth) sin requerir permisos de transacción ni custodia de fondos.
* 📈 **Gráficos e Historial:** Seguimiento visual de la evolución del portafolio, distribución de activos y alertas de precios.
* 🎨 **Experiencia Visual Interactiva:** Interfaz optimizada e intuitiva enriquecida con elementos 3D dinámicos.
* 📱 **Diseño Responsive:** Adaptabilidad fluida para dispositivos móviles, tablets y escritorio.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto sigue una arquitectura desacoplada y escalable:

### Frontend
* **Core:** Next.js, React, TypeScript
* **Estilos:** CSS / CSS Modules
* **Gráficos 3D & Data Viz:** Three.js
* **Despliegue:** Vercel

### Backend & Persistencia
* **Lenguaje & Framework:** Python, FastAPI
* **Base de Datos Principal:** PostgreSQL
* **Caché & Performance:** Redis
* **Autenticación & Seguridad:** JWT + OAuth2 (Google)
* **Contenerización & Despliegue:** Docker, Railway

---

## ⚙️ Requisitos Previos

Para ejecutar el proyecto de forma local necesitarás:

* Node.js (v18.x o superior)
* Python (3.10+ recomendado)
* Docker y Docker Compose
* Git

---

## 🚀 Instalación y Configuración

1. **Clonar el repositorio:**
   `git clone https://github.com/Roccomcs/Ahorrando-Ando.git`
   `cd Ahorrando-Ando`

2. **Entorno Frontend (Next.js):**
   * Instalar dependencias: `npm install`
   * Configurar variables de entorno: `cp .env.example .env.local`
   * Ejecutar en desarrollo: `npm run dev`

3. **Entorno Backend (FastAPI + Docker):**
   * Configurar variables de entorno: `cp .env.example .env`
   * Levantar servicios (PostgreSQL, Redis y API): `docker-compose up --build`

---

## 💡 Uso y Flujo de Trabajo

1. Ingresa a la aplicación e inicia sesión mediante **OAuth2 (Google)** o credenciales JWT.
2. Vincula tus fuentes financieras (billeteras, exchanges o brokers) mediante integraciones de lectura.
3. Configura tus preferencias de moneda base (ARS / USD).
4. Monitorea la distribución de tus activos, rendimiento histórico y alertas de valor en tiempo real desde el dashboard.

---

## 🌐 Despliegue

* **Frontend:** Desplegado en [Vercel](https://ahorrando-ando-tawny.vercel.app/).
* **Backend:** Ejecutándose en contenedores **Docker** alojados en [Railway](https://railway.app/).

---

## 🤝 Contribuciones

Las contribuciones, reportes de fallos (issues) y sugerencias son bienvenidas.

1. Haz un **Fork** del repositorio.
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`).
3. Haz un **Commit** con tus cambios (`git commit -m 'feat: agrega nueva funcionalidad'`).
4. Haz **Push** a tu rama (`git push origin feature/NuevaCaracteristica`).
5. Abre un **Pull Request**.

---

## 📜 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## ✉️ Contacto

**Rocco Moreno**  
* **GitHub:** [@Roccomcs](https://github.com/Roccomcs)
* **LinkedIn:** [Rocco Moreno](https://www.linkedin.com/in/rocco-moreno-9a31b3323/)
* **Demo Live:** [ahorrando-ando-tawny.vercel.app](https://ahorrando-ando-tawny.vercel.app/)
