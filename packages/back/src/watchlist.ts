import type {
  MarketDataSource,
  Range,
  WatchSummary,
  HistoryPoint,
} from "@stock-tracker/shared";
import { prisma } from "./db";
import { pctChange } from "./calc";

// Trae el historial de un símbolo desde el proveedor y lo guarda en la DB.
// Devuelve cuántos PricePoints NUEVOS se guardaron. Es idempotente: gracias al
// @@unique(symbol, date) + skipDuplicates, correrla de nuevo solo agrega los
// días que faltan. La usan tanto addWatch (con "1Y") como el worker (con "1W").
export async function syncHistory(
  source: MarketDataSource,
  symbol: string,
  range: Range,
): Promise<number> {
  const candles = await source.getHistory(symbol, range);
  const { count } = await prisma.pricePoint.createMany({
    data: candles.map((c) => ({
      symbol,
      date: new Date(c.date),
      close: c.close,
    })),
    skipDuplicates: true,
  });
  return count;
}

// Agrega un símbolo a la watchlist y trae su historial (backfill) a la DB.
// Recibe el `source` por parámetro (inyección): así esta lógica no depende de
// QUÉ proveedor es, ni de cómo se creó. Testeable y desacoplada.
export async function addWatch(
  source: MarketDataSource,
  userId: number,
  symbol: string,
  range: Range = "1Y",
) {
  // Traemos el quote para el nombre lindo ("Apple Inc." en vez de "AAPL") y, de
  // paso, esto valida que el símbolo exista antes de guardarlo.
  const quote = await source.getQuote(symbol);

  // Registrar en la watchlist DEL USUARIO. upsert idempotente por (userId, symbol):
  // si ya lo sigue, no revienta y de paso refresca el nombre.
  const watch = await prisma.watch.upsert({
    where: { userId_symbol: { userId, symbol } },
    update: { name: quote.name },
    create: { userId, symbol, name: quote.name },
  });

  // Backfill del historial reusando syncHistory.
  const savedPricePoints = await syncHistory(source, symbol, range);

  return { watch, savedPricePoints };
}

// Lee de la DB el historial guardado de un símbolo (solo lo que el gráfico
// necesita: fecha + cierre), ordenado viejo → nuevo.
export async function getStoredHistory(
  symbol: string,
): Promise<HistoryPoint[]> {
  const points = await prisma.pricePoint.findMany({
    where: { symbol },
    orderBy: { date: "asc" },
    select: { date: true, close: true },
  });
  // date es un Date (medianoche UTC); lo pasamos a "YYYY-MM-DD" para el cable.
  return points.map((p) => ({
    date: p.date.toISOString().slice(0, 10),
    close: p.close,
  }));
}

// Lista lo que sigue UN usuario.
export async function listWatches(userId: number) {
  return prisma.watch.findMany({
    where: { userId },
    orderBy: { symbol: "asc" },
  });
}

// Deja de seguir un símbolo (de la watchlist del usuario). deleteMany en vez de
// delete: si no lo seguía, no revienta (idempotente). No borra los PricePoint,
// que son globales y le sirven a otros usuarios / de caché.
export async function removeWatch(userId: number, symbol: string) {
  await prisma.watch.deleteMany({ where: { userId, symbol } });
}

// Todos los símbolos únicos que sigue CUALQUIER usuario. Lo usa el worker, que
// actualiza los cierres de todo lo que alguien está trackeando (no por usuario).
export async function getAllTrackedSymbols(): Promise<string[]> {
  const rows = await prisma.watch.findMany({
    distinct: ["symbol"],
    select: { symbol: true },
  });
  return rows.map((r) => r.symbol);
}

// Arma el resumen de la watchlist con el "% desde que empecé a trackear".
// Se calcula 100% desde la DB (precios ya cacheados): el precio base es el primer
// cierre desde startedAt, y el precio actual es el último cierre guardado.
export async function getWatchlistSummary(
  userId: number,
): Promise<WatchSummary[]> {
  const watches = await listWatches(userId);

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

      // Últimos 30 cierres para el sparkline. Los pido desc (los más nuevos) y
      // los doy vuelta a viejo → nuevo, que es como se dibuja el gráfico.
      const recent = await prisma.pricePoint.findMany({
        where: { symbol: w.symbol },
        orderBy: { date: "desc" },
        take: 30,
        select: { close: true },
      });
      const spark = recent.map((p) => p.close).reverse();

      const pctSinceStart =
        first && last ? pctChange(first.close, last.close) : null;

      return {
        symbol: w.symbol,
        name: w.name,
        // Fechas como string ISO (el contrato HTTP; JSON no tiene Date).
        startedAt: w.startedAt.toISOString(),
        startClose: first?.close ?? null,
        lastClose: last?.close ?? null,
        lastDate: last ? last.date.toISOString() : null,
        pctSinceStart,
        spark,
      };
    }),
  );
}
