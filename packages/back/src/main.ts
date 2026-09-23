import { buildServer } from "./server";

// Carga el .env (API key, DATABASE_URL, etc.) antes de arrancar.
process.loadEnvFile();

const app = buildServer();

// Puerto configurable por entorno (útil en deploy); 3000 por defecto en local.
const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port });
  // Fastify ya loguea "Server listening at http://..." por su cuenta.
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
