# Stock Tracker — Plan y contexto del proyecto

> **Para la sesión nueva de Claude:** este documento tiene TODO lo necesario para retomar el
> proyecto sin repetir el análisis previo. Leelo entero antes de arrancar. El modo de trabajo
> (sección 8) es obligatorio. La memoria del usuario ya contiene los facts clave
> (`project_stock_tracker`, `feedback_modo_trabajo_stock_tracker`); esto es el detalle largo.

---

## 1. Contexto y objetivo

Santiago (Santi) es un dev **junior** hispanohablante (rioplatense), armando su primer portfolio
para buscar trabajo. Sabe: React, Vite, Tailwind, JS, Python, algo de C#/WinForms, Git/GitHub,
Vercel, algo de Supabase. Sigue el mercado financiero por interés propio (Merval, S&P 500, Nasdaq,
acciones).

**Objetivo del proyecto:** un proyecto de aprendizaje full-stack **TypeScript** que:
1. Tape sus baches de código reales (ver sección 2).
2. Le enseñe **TypeScript** (nunca lo usó, quiere aprenderlo).
3. Resuelva algo que le interesa de verdad (seguir el mercado) → motivación extra.

Dedicación: **~2 h/día** de base, algún día 3-4 h. Ritmo tranquilo, foco en entender, no en entregar.

---

## 2. Diagnóstico de nivel (de analizar sus 3 proyectos: portfolio React, Renti-bot Python, lab C#)

**Fortalezas (arriba del promedio junior):**
- Documentación y comunicación excelentes; comentarios que explican el **porqué**.
- Buen instinto de arquitectura: separa en capas, centraliza (`Tema.cs`, `constants.js`).
- Mentalidad de debugging de causa raíz y QA (encontró bugs reales integrando con otros).
- Git: ramas, PRs, integración con backend ajeno.
- Patrones React que sorprenden (refs para closures, cleanup de listeners/RAF).

**Baches a atacar A PROPÓSITO con este proyecto (el mismo defecto apareció en los 3 proyectos):**
1. **No abstrae comportamiento** → 3 scrapers copy-paste (Renti-bot), sistema de balas duplicado
   Game↔SectionShooter (portfolio), 5 UserControls sin clase base (C#). ESTE es el bache #1.
2. **Sin tipado** (sin type hints en Python, sin PropTypes/TS en React).
3. **Evita async** (scrapers secuenciales; C# síncrono contra DB remota → UI congelada).
4. **Manejo de errores pobre** (`except: pass`, catches que tragan el error, sin timeouts).
5. **Tests ausentes o rotos** (en Renti-bot los tests fallan siempre y mutan datos reales).
6. **No piensa en re-renders/performance** (portfolio: cero memoización).
7. Contraseñas en texto plano (C#) → aprender auth con hash.

**El salto que le toca:** de "código que funciona" a "código robusto y no duplicado".

---

## 3. Qué es el proyecto

Un tracker de mercado. El usuario busca una empresa o índice (`AAPL`, `NVDA`, S&P 500, Nasdaq,
Merval), lo agrega a su watchlist, y **desde el día que lo empieza a seguir** el sistema guarda el
cierre diario. El dashboard muestra por cada uno: precio actual, **% desde que lo empezó a
trackear**, % del día, y un **gráfico de evolución**. Un worker actualiza los precios solo, 1 vez/día.

Nombre provisorio: **"Ticker"** (Santi puede renombrar antes del primer commit).

**Features "más adelante" (NO en el MVP):** alertas por email, comparativas entre acciones,
cartera con precio de compra/ganancia. Arrancar con el núcleo (lección propia de Santi: no meter
features de más al principio).

---

## 4. Stack completo y por qué

| Capa | Herramienta | Por qué |
|---|---|---|
| Lenguaje | **TypeScript** | Bache de tipado; un solo lenguaje front+back |
| Front | **React + Vite + Tailwind** | Ya los sabe; reaprovecha conocimiento + TS encima |
| Front | **Recharts** | Gráfico de evolución del precio, declarativo |
| Front | **TanStack Query** | Manejo de estado de servidor (fetch/caché/loading/error) — nunca lo hizo bien |
| Back | **Node.js** | Runtime del servidor |
| Back | **Fastify** | API REST liviana y tipada (mejor que Express para TS) |
| Back | **Zod** | Validación en runtime + infiere tipos; valida inputs Y respuestas de la API externa |
| Back | **node-cron** | Worker diario que baja precios (evolución del `schedule` frágil de Flask) |
| DB | **PostgreSQL** | Relacional, la más pedida; relaciones + integridad |
| DB | **Prisma** | ORM tipado; modelo en TS, consultas tipadas, migraciones (sin SQL a mano como en C#) |
| DB | **Supabase** | Hosting Postgres free; ya lo tocó en el lab |
| Test | **Vitest** | Bache de tests; test-primero (BDD-lite) |
| Calidad | **ESLint + Prettier** | Consistencia y buenas prácticas |
| Test (opcional, Sem 6) | **Cucumber/Gherkin** | Tests de aceptación de la API; skill para el CV |
| Infra | **Git + GitHub** | Control de versiones (ya lo usa) |
| Infra | **GitHub Actions** | CI: corre tests/lint en cada push (que no queden rotos como en Renti-bot) |
| Deploy | **Vercel** (front) + **Railway/Render** (back) | Free tier; Vercel ya lo usó |
| Repo | **npm workspaces (monorepo)** | Paquetes `front`/`back`/`shared`; compartir tipos desde una fuente única |
| Datos | **API financiera (Finnhub / Twelve Data)** | Fuente de precios; su rate limit gratis OBLIGA a aprender caché en DB |

---

## 5. Arquitectura clave (el corazón pedagógico)

### 5.1 La interfaz `MarketDataSource` (ataca el bache #1: abstracción)
En vez de un archivo por API copiado y pegado, UNA interfaz que cada proveedor implementa:

```ts
interface MarketDataSource {
  name: string;
  supports(symbol: string): boolean;                 // Finnhub no tiene Merval, Twelve Data sí
  getQuote(symbol: string): Promise<Quote>;
  getHistory(symbol: string, range: Range): Promise<Candle[]>;
}
```

Un registro elige el primer proveedor que soporta el símbolo, con **fallback** si uno falla o está
rate-limited (`Promise.allSettled` → fallos parciales, que Renti-bot ignoraba).
**Métrica de éxito medible:** sumar un proveedor nuevo = 1 archivo nuevo, 0 archivos existentes
tocados (Open/Closed). Si lo logra, aprendió a abstraer comportamiento.

### 5.2 Modelo de datos (Prisma)
```
User        → id, email, passwordHash
Watch       → id, userId, symbol, name, startedAt   (lo que el user elige seguir)
PricePoint  → id, symbol, date, close   (serie temporal; ÚNICA por symbol+date)
```
El "% desde que empecé" NO se guarda: se **deriva** del `PricePoint` en `startedAt` vs el último
(derivar en vez de duplicar → misma lección de no desincronizar datos).

### 5.3 La lección "de producción"
Las APIs financieras gratis tienen rate limits duros → un **worker** baja los precios 1 vez y los
**cachea en la DB**; el front y el cálculo de % leen de la DB, no de la API. Es el patrón que
Renti-bot no tenía (pegaba a la fuente en cada corrida).

---

## 6. Roadmap (2 h/día, ~6 semanas). MVP primero.

1. **Sem 1** — Monorepo TS + interfaz `MarketDataSource` con UN proveedor (mercado US). Traer
   quote + historial de un símbolo por consola. *Bache: TS + async + la interfaz desde el día 1.*
2. **Sem 2** — Postgres + Prisma: `Watch` + `PricePoint`, backfill de historial al agregar. API
   Fastify con Zod. *Full-stack + validación.*
3. **Sem 3** — Front React+TS: buscar, agregar, listar con % desde `startedAt` + gráfico (Recharts).
   *Front tipado + TanStack Query.*
4. **Sem 4** — Worker diario (`allSettled`) + **segundo proveedor** para Merval/acciones argentinas.
   *Async serio + el pago de la abstracción.*
5. **Sem 5** — Auth con hash (redención del texto plano de C#) + multi-usuario. *Auth real.*
6. **Sem 6** — Tests con fixtures (respuestas de API guardadas) + CI + deploy. *Tests + robustez.*

---

## 7. Decisiones ya tomadas

- **Proveedor inicial: mercado US** (S&P 500 `^GSPC`/`SPY`, Nasdaq `^IXIC`/`QQQ`, acciones `AAPL`,
  `NVDA`) porque las APIs gratis lo cubren estable. **Merval / acciones argentinas → Semana 4**,
  como estreno del segundo proveedor (el momento en que la abstracción "paga").
- **Auth en la Semana 5, no antes:** arranca single-user para tener algo andando rápido.
- **BDD-lite con Vitest, NO Cucumber/Gherkin de entrada** (Cucumber es ceremonia que frena al ir
  solo; se deja como hito opcional de la capa API en Sem 6). Nota: Santi al principio dijo "BDD" y
  se refería a **Base De Datos**, no a Behavior-Driven Development — aclarado.
- **DB: PostgreSQL en Supabase + Prisma**, todo tipado.

---

## 8. MODO DE TRABAJO (obligatorio)

- Santi **codea él mismo, línea por línea, entendiendo qué hace cada cosa.** El objetivo es
  aprender, no entregar rápido. NO darle archivos enteros hechos de la lógica.
- **Claude explica** qué se va a hacer y **el porqué** (en **español rioplatense**), le pasa el
  bloque para que **lo tipee él**, y lo repasan juntos.
- **Claude se encarga del andamiaje aburrido** (configs de TS, `package.json`, tooling, ESLint,
  docker-compose) para no gastarle sus ~2h en boilerplate. Eso se revisa por arriba, no se tipea a mano.
- **Pasos chiquitos y verificables:** cada paso corre y hace algo antes de seguir. Nada de 200
  líneas y rezar.
- **Test-primero (BDD-lite):** escribir el comportamiento esperado como test de Vitest en lenguaje
  claro (`describe("cuando...")`), verlo fallar, y recién ahí implementar.
- **Regla firme:** mostrar propuesta y esperar OK ANTES de codear/compilar cambios grandes.

---

## 9. Estado actual y próximo paso

- **Entorno verificado:** Node v24.15.0, npm 11.12.1, git 2.54.0. **No hay pnpm** (usar npm workspaces).
- **Nada scaffoldeado todavía.** Solo existe esta carpeta `stock-tracker/` con este `PLAN.md`.
- **Próximo paso (Semana 1, paso 1):** Claude arma el esqueleto del monorepo (root `package.json`
  con workspaces, `tsconfig` base, paquete `back` con tsx para correr TS, paquete `shared`),
  verifica que un "hello TS" corre, y **después guía a Santi para que escriba él, línea por línea,
  los tipos del dominio (`Quote`, `Candle`, `Range`) y la interfaz `MarketDataSource`** en el
  paquete `shared`, con un primer test de Vitest.

---

## 10. Cómo retomar en una sesión nueva

En la sesión nueva, Santi puede decir algo como:
> "Retomemos el proyecto stock-tracker. Leé `C:\Users\Monti\Claudia\stock-tracker\PLAN.md` y
> arranquemos la Semana 1."

Claude debe: leer este plan, respetar el modo de trabajo (sección 8), y empezar por el próximo paso
(sección 9).
