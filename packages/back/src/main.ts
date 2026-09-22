import { createTwelveDataSource } from "./providers/twelvedata";
import { addWatch, getStoredHistory, listWatches } from "./watchlist";
import { prisma } from "./db";

process.loadEnvFile();

const apiKey = process.env.TWELVE_DATA_API_KEY;
if (!apiKey) {
  console.error("❌ Falta TWELVE_DATA_API_KEY en packages/back/.env");
  process.exit(1);
}

const source = createTwelveDataSource(apiKey);

// Agregar a la watchlist + backfill del último mes.
const { watch, savedPricePoints } = await addWatch(source, "AAPL", "1M");
console.log(`Watch "${watch.symbol}": ${savedPricePoints} PricePoints nuevos guardados.`);

// Leer de la DB lo que quedó guardado (no de la API).
const history = await getStoredHistory("AAPL");
console.log(`\nHistorial en la DB (${history.length} puntos, últimos 5):`);
console.table(history.slice(-5));

const watches = await listWatches();
console.log(
  "\nWatchlist:",
  watches.map((w) => w.symbol),
);

// Cerrar la conexión para que el proceso termine limpio.
await prisma.$disconnect();
