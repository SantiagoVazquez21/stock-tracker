import { PrismaClient } from "@prisma/client";

// Carga DATABASE_URL/DIRECT_URL del .env si el archivo existe. En tests (que
// corren desde otro directorio) o en deploy (donde las variables se inyectan
// directo), no hay .env y eso NO debe romper el import.
try {
  process.loadEnvFile();
} catch {
  // Sin .env: seguimos con lo que ya haya en process.env.
}

// Una sola instancia del cliente para toda la app (patrón singleton): abrir
// una conexión por consulta sería un desperdicio. Todos importan este `prisma`.
export const prisma = new PrismaClient();
