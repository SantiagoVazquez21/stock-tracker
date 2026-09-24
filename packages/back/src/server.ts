import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import type { MarketDataSource } from "@stock-tracker/shared";
import { addWatch, getStoredHistory, getWatchlistSummary } from "./watchlist";

// Un símbolo válido: SOLO letras, números y puntos (para tickers como "AAPL" o
// "GGAL.BA"), máximo 12 caracteres. El regex es la defensa clave: un string
// libre permitía inyectar parámetros en la URL de la API externa
// (ej. "AAPL&apikey=..."). El .toUpperCase() normaliza al final.
const symbolSchema = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z0-9.]{1,12}$/,
    "Símbolo inválido: solo letras, números y puntos (máx. 12).",
  )
  .toUpperCase();

const AddWatchBody = z.object({ symbol: symbolSchema });

// Arma el servidor y devuelve la app SIN levantarla (sin .listen()). Recibe el
// `source` inyectado: la API no sabe qué proveedor es, solo lo usa.
// async porque los plugins (rate-limit, cors) se registran con await ANTES de
// las rutas: así su hook global alcanza a todos los endpoints.
export async function buildServer(options: {
  source: MarketDataSource;
  logger?: boolean;
  rateLimitMax?: number;
}) {
  const { source } = options;
  const app = Fastify({ logger: options.logger ?? true });

  // Rate limiting: máximo N pedidos por IP por minuto. Frena el spam que podría
  // agotar la cuota de la API externa o llenar la DB. Al superarlo → 429.
  await app.register(rateLimit, {
    max: options.rateLimitMax ?? 60,
    timeWindow: "1 minute",
  });

  // CORS: el front corre en otro origen (puerto distinto) y el navegador, por
  // seguridad, bloquea esos pedidos salvo que el server los autorice. origin:true
  // refleja el origen que pide (cómodo en dev). En producción: restringir al
  // dominio real del front.
  await app.register(cors, { origin: true });

  // Healthcheck: confirma que el server está vivo.
  app.get("/health", async () => {
    return { status: "ok" };
  });

  // Lista la watchlist con el "% desde que empecé" (todo desde la DB).
  app.get("/watches", async () => {
    return getWatchlistSummary();
  });

  // Agrega un símbolo a la watchlist + backfill de su historial.
  app.post("/watches", async (request, reply) => {
    const parsed = AddWatchBody.safeParse(request.body);
    if (!parsed.success) {
      // Input inválido: 400 y le decimos al cliente qué estuvo mal.
      return reply.code(400).send({ error: "Body inválido", details: parsed.error.issues });
    }

    try {
      const result = await addWatch(source, parsed.data.symbol);
      return reply.code(201).send(result); // 201 = creado
    } catch (err) {
      // Falló el proveedor externo (símbolo inexistente, rate limit, etc.).
      request.log.error(err);
      return reply.code(502).send({ error: `No se pudo agregar ${parsed.data.symbol}` });
    }
  });

  // Historial guardado de un símbolo (para el gráfico). Validamos el símbolo del
  // path con el MISMO schema: nada entra sin pasar el filtro.
  app.get<{ Params: { symbol: string } }>("/watches/:symbol/history", async (request, reply) => {
    const parsed = symbolSchema.safeParse(request.params.symbol);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Símbolo inválido" });
    }
    return getStoredHistory(parsed.data);
  });

  return app;
}
