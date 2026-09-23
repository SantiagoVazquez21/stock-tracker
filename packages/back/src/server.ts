import Fastify from "fastify";
import { z } from "zod";
import type { MarketDataSource } from "@stock-tracker/shared";
import { addWatch, getStoredHistory, getWatchlistSummary } from "./watchlist";

// Valida el body del POST /watches. .trim() saca espacios, .min(1) exige que no
// esté vacío, .toUpperCase() normaliza el ticker ("aapl" -> "AAPL").
const AddWatchBody = z.object({
  symbol: z.string().trim().min(1).toUpperCase(),
});

// Arma el servidor y devuelve la app SIN levantarla (sin .listen()). Recibe el
// `source` inyectado: la API no sabe qué proveedor es, solo lo usa.
export function buildServer(options: { source: MarketDataSource; logger?: boolean }) {
  const { source } = options;
  const app = Fastify({ logger: options.logger ?? true });

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

  // Historial guardado de un símbolo (para el gráfico).
  app.get<{ Params: { symbol: string } }>("/watches/:symbol/history", async (request) => {
    const symbol = request.params.symbol.toUpperCase();
    return getStoredHistory(symbol);
  });

  return app;
}
