import { PrismaClient } from "@prisma/client";

// Carga DATABASE_URL/DIRECT_URL del .env antes de instanciar el cliente.
process.loadEnvFile();

// Una sola instancia del cliente para toda la app (patrón singleton): abrir
// una conexión por consulta sería un desperdicio. Todos importan este `prisma`.
export const prisma = new PrismaClient();
