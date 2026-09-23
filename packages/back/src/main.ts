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

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port });
  // Fastify ya loguea "Server listening at http://..." por su cuenta.
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
