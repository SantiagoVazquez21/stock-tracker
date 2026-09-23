import { buildServer } from "./server";
import { createTwelveDataSource } from "./providers/twelvedata";

// Carga el .env (API key, DATABASE_URL, etc.) antes de arrancar.
process.loadEnvFile();

const apiKey = process.env.TWELVE_DATA_API_KEY;
if (!apiKey) {
  console.error("❌ Falta TWELVE_DATA_API_KEY en packages/back/.env");
  process.exit(1);
}

// main es el "composition root": crea las dependencias concretas (el proveedor)
// y se las inyecta al server.
const source = createTwelveDataSource(apiKey);
const app = buildServer({ source });

// 3001 por default en local (el 3000 lo usa otro proyecto). En deploy, la
// plataforma inyecta PORT y ese manda.
const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port });
  // Fastify ya loguea "Server listening at http://..." por su cuenta.
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
