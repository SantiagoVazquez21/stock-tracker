import type { MarketDataSource, Range } from "@stock-tracker/shared";
import { prisma } from "./db";
import { pctChange } from "./calc";

// Agrega un símbolo a la watchlist y trae su historial (backfill) a la DB.
// Recibe el `source` por parámetro (inyección): así esta lógica no depende de
// QUÉ proveedor es, ni de cómo se creó. Testeable y desacoplada.
export async function addWatch(
  source: MarketDataSource,
  symbol: string,
  range: Range = "1Y",
) {
  // 1. Registrar en la watchlist. upsert = idempotente: si ya lo seguís, no
  //    revienta por el @unique; simplemente lo deja como está.
  //    name = symbol por ahora. CARTEL: traer el nombre lindo ("Apple Inc.")
  //    del proveedor más adelante.
  const watch = await prisma.watch.upsert({
    where: { symbol },
    update: {},
    create: { symbol, name: symbol },
  });

  // 2. Backfill: pedirle el historial al proveedor y guardarlo.
  const candles = await source.getHistory(symbol, range);
  const { count } = await prisma.pricePoint.createMany({
    data: candles.map((c) => ({
      symbol,
      date: new Date(c.date),
      close: c.close,
    })),
    // No re-guarda cierres que ya tenemos (gracias al @@unique symbol+date).
    // Volver a correrlo mañana solo agrega los días nuevos.
    skipDuplicates: true,
  });

  return { watch, savedPricePoints: count };
}

// Lee de la DB el historial guardado de un símbolo, ordenado viejo → nuevo.
export async function getStoredHistory(symbol: string) {
  return prisma.pricePoint.findMany({
    where: { symbol },
    orderBy: { date: "asc" },
  });
}

// Lista lo que el usuario sigue.
export async function listWatches() {
  return prisma.watch.findMany({ orderBy: { symbol: "asc" } });
}

// Arma el resumen de la watchlist con el "% desde que empecé a trackear".
// Se calcula 100% desde la DB (precios ya cacheados): el precio base es el primer
// cierre desde startedAt, y el precio actual es el último cierre guardado.
export async function getWatchlistSummary() {
  const watches = await listWatches();

  // Por cada símbolo, dos consultas chiquitas (primer y último cierre). Para
  // pocos símbolos alcanza; si la lista creciera mucho, se optimiza con una
  // sola query agregada.
  return Promise.all(
    watches.map(async (w) => {
      // startedAt tiene hora (ej. 16:54); los PricePoint.date son solo fecha
      // (medianoche). Trunco a medianoche para incluir el cierre del MISMO día
      // en que empezaste a seguirlo, y no arrancar recién al día siguiente.
      const startDay = new Date(w.startedAt);
      startDay.setUTCHours(0, 0, 0, 0);

      const first = await prisma.pricePoint.findFirst({
        where: { symbol: w.symbol, date: { gte: startDay } },
        orderBy: { date: "asc" },
      });
      const last = await prisma.pricePoint.findFirst({
        where: { symbol: w.symbol },
        orderBy: { date: "desc" },
      });

      const pctSinceStart =
        first && last ? pctChange(first.close, last.close) : null;

      return {
        symbol: w.symbol,
        name: w.name,
        startedAt: w.startedAt,
        startClose: first?.close ?? null,
        lastClose: last?.close ?? null,
        lastDate: last?.date ?? null,
        pctSinceStart,
      };
    }),
  );
}
