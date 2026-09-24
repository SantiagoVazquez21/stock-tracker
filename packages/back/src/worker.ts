import type { MarketDataSource } from "@stock-tracker/shared";
import { listWatches, syncHistory } from "./watchlist";

export interface UpdateResult {
  symbol: string;
  ok: boolean;
  saved?: number;
  error?: string;
}

// Lógica PURA (sin DB, sin red): actualiza una lista de símbolos usando la
// función `sync` que le pasen, tolerando fallos parciales con Promise.allSettled.
// allSettled espera a TODAS y nunca corta: si una promesa rechaza, las demás
// igual se resuelven. Lo contrario a Promise.all (que corta al primer error).
export async function updateSymbols(
  symbols: string[],
  sync: (symbol: string) => Promise<number>,
): Promise<UpdateResult[]> {
  const settled = await Promise.allSettled(symbols.map((s) => sync(s)));

  return settled.map((r, i) => {
    const symbol = symbols[i];
    if (r.status === "fulfilled") {
      return { symbol, ok: true, saved: r.value };
    }
    return { symbol, ok: false, error: String(r.reason) };
  });
}

// Orquestador (efectos): lee la watchlist de la DB y actualiza cada símbolo con
// el cierre de la última semana. Reusa syncHistory (idempotente). Si un símbolo
// falla, los demás se actualizan igual.
export async function runDailyUpdate(
  source: MarketDataSource,
): Promise<UpdateResult[]> {
  const watches = await listWatches();
  return updateSymbols(
    watches.map((w) => w.symbol),
    (symbol) => syncHistory(source, symbol, "1W"),
  );
}
