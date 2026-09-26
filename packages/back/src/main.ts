import cron from "node-cron";
import { buildServer } from "./server";
import { createTwelveDataSource } from "./providers/twelvedata";
import { createYahooSource } from "./providers/yahoo";
import { createRegistry } from "./providers/registry";
import { runDailyUpdate } from "./worker";

// Carga el .env (API key, DATABASE_URL, etc.) antes de arrancar.
// En local carga el .env; en prod (Render) no hay archivo y las variables vienen
// inyectadas por la plataforma, así que la ausencia del .env no debe romper nada.
try {
  process.loadEnvFile();
} catch {
  // Sin .env: seguimos con lo que haya en process.env.
}

const apiKey = process.env.TWELVE_DATA_API_KEY;
if (!apiKey) {
  console.error("❌ Falta TWELVE_DATA_API_KEY en packages/back/.env");
  process.exit(1);
}

// Secreto para firmar los JWT de sesión. Sin esto no arranca (nunca hardcodearlo).
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("❌ Falta JWT_SECRET en packages/back/.env");
  process.exit(1);
}

// main es el "composition root": crea las dependencias concretas (el proveedor)
// y se las inyecta al server.
// Registro con los dos proveedores: Twelve Data (US) + Yahoo (Merval, ".BA").
// El resto de la app usa `source` sin saber que por debajo hay varios.
const source = createRegistry([
  createTwelveDataSource(apiKey),
  createYahooSource(),
]);

// Orígenes permitidos por CORS. En prod se setea ALLOWED_ORIGINS (coma-separada)
// con el dominio real del front; en local, el Vite del front.
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [
  "http://localhost:5174",
];

// Token de Marketaux para el panel de noticias analizadas. OPCIONAL: si falta,
// /news devuelve [] y el front muestra "sin noticias" (no se cae nada).
const marketauxToken = process.env.MARKETAUX_API_TOKEN;
if (!marketauxToken) {
  console.warn("⚠️  Sin MARKETAUX_API_TOKEN: el panel de noticias irá vacío.");
}

const app = await buildServer({
  source,
  allowedOrigins,
  jwtSecret,
  marketauxToken,
});

// Worker diario: a las 22:00 (tras el cierre del mercado US) actualiza los
// cierres de todos los símbolos de la watchlist. Corre mientras el proceso del
// back esté vivo. En deploy el back está siempre on; en local corre si está
// prendido a esa hora.
cron.schedule("0 22 * * *", async () => {
  app.log.info("Worker diario: actualizando cierres…");
  const results = await runDailyUpdate(source);
  app.log.info({ results }, "Worker diario: listo");
});

// 3001 por default en local (el 3000 lo usa otro proyecto). En deploy, la
// plataforma inyecta PORT y ese manda.
const port = Number(process.env.PORT ?? 3001);

try {
  // host 0.0.0.0 = escucha en todas las interfaces. En un contenedor de deploy
  // (Railway/Render) es obligatorio; en local funciona igual.
  await app.listen({ port, host: "0.0.0.0" });
  // Fastify ya loguea "Server listening at http://..." por su cuenta.
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
