import type { MarketDataSource, Range } from "@stock-tracker/shared";
import { prisma } from "./db";

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
