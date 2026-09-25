# 📈 Ticker — Stock Tracker

App full-stack para seguir el mercado. Buscás una acción o índice, lo agregás a tu
watchlist, y **desde el día que lo empezás a seguir** ves su precio actual, cuánto
subió o bajó, y un gráfico de su evolución. Cubre mercado **US** y **Merval**.

### 🔗 Demo en vivo: **https://stock-tracker-gules-seven.vercel.app**

> Proyecto de aprendizaje full-stack **TypeScript**, de cero a producción.

---

## ✨ Funcionalidades

- 🔐 **Registro e inicio de sesión** con autenticación segura.
- ⭐ **Watchlist personal**: cada usuario ve solo la suya.
- 💹 Por cada símbolo: **precio**, **% desde que lo empezaste a trackear** y **gráfico** de evolución.
- 🌎 **Múltiples mercados**: acciones e índices de **EE.UU.** (`AAPL`, `NVDA`…) y del **Merval** (`GGAL.BA`, `YPFD.BA`…).
- 🤖 **Worker diario** que actualiza los cierres automáticamente.

## 🛠️ Stack

**Monorepo TypeScript** (npm workspaces): `shared` · `back` · `front`.

| Capa | Tecnologías |
|---|---|
| **Front** | React · Vite · Tailwind · TanStack Query · Recharts |
| **Back** | Node · Fastify · Zod · Prisma |
| **DB** | PostgreSQL (Supabase) |
| **Auth** | JWT en cookie `httpOnly` · bcrypt |
| **Seguridad** | rate limiting · CORS allowlist · Helmet · validación de inputs |
| **Calidad** | Vitest · GitHub Actions (CI) |
| **Deploy** | Vercel (front) · Render (back) |

## 🏛️ Decisiones de arquitectura

- **Proveedores de datos intercambiables** (`MarketDataSource`): cada fuente (Twelve Data
  para US, Yahoo para Merval) implementa una misma interfaz, y un registro elige el
  proveedor según el símbolo. **Sumar una fuente nueva = un archivo nuevo, sin tocar el resto.**
- **Derivar en vez de duplicar**: el "% desde que empecé" no se guarda, se **calcula**
  a partir de los precios almacenados — así nunca queda desincronizado.
- **Caché en la base**: los precios se bajan una vez (worker) y se leen de la DB, no
  de la API externa en cada request (respeta los rate limits gratuitos).
- **Seguridad por capas**: validación con allowlist, rate limiting, CORS restringido,
  headers de Helmet, contraseñas hasheadas y sesión en cookie `httpOnly`.

## 🚀 Correr en local

**Requisitos:** Node 22+ y una base PostgreSQL (ej. un proyecto gratis en Supabase).

```bash
# 1. Instalar dependencias (desde la raíz)
npm install

# 2. Configurar variables de entorno del back
cp packages/back/.env.example packages/back/.env
#   completar: TWELVE_DATA_API_KEY, DATABASE_URL, DIRECT_URL, JWT_SECRET
#   (JWT_SECRET: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")

# 3. Crear las tablas
npm run build -w @stock-tracker/back            # genera el cliente de Prisma
npx prisma migrate deploy --schema=packages/back/prisma/schema.prisma

# 4. Levantar back (:3001) y front (:5174) en dos terminales
npm run dev:back
npm run dev:front
```

## 📜 Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev:back` | Levanta la API (Fastify) |
| `npm run dev:front` | Levanta el front (Vite) |
| `npm test` | Corre los tests (Vitest) |
| `npm run typecheck` | Chequea los tipos de todo el monorepo |

## 📁 Estructura

```
stock-tracker/
├─ packages/
│  ├─ shared/   # tipos del dominio + contratos de la API (fuente única)
│  ├─ back/     # API Fastify, Prisma, proveedores de datos, worker
│  └─ front/    # React + Vite (dashboard)
└─ .github/workflows/ci.yml   # CI: typecheck + tests en cada push
```
