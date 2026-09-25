import { z } from "zod";
import type { SymbolSearchResult } from "@stock-tracker/shared";

const YAHOO_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search";

// Solo validamos lo que usamos de cada resultado (Yahoo devuelve muchos campos).
const SearchResponseSchema = z.object({
  quotes: z.array(
    z.object({
      symbol: z.string(),
      shortname: z.string().optional(),
      longname: z.string().optional(),
      exchDisp: z.string().optional(),
      quoteType: z.string().optional(),
    }),
  ),
});

// Nos quedamos con acciones, ETFs e índices (descartamos monedas, cripto, etc.).
const ALLOWED_TYPES = new Set(["EQUITY", "ETF", "INDEX"]);

// Busca símbolos por ticker parcial o por nombre de empresa (vía Yahoo, que
// cubre US y Merval). Devuelve una lista corta para el autocomplete.
export async function searchSymbols(
  query: string,
): Promise<SymbolSearchResult[]> {
  const url = `${YAHOO_SEARCH}?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`Yahoo search respondió ${res.status}`);
  }

  const { quotes } = SearchResponseSchema.parse(await res.json());
  return quotes
    .filter((q) => !q.quoteType || ALLOWED_TYPES.has(q.quoteType))
    .map((q) => ({
      symbol: q.symbol,
      name: q.longname ?? q.shortname ?? q.symbol,
      exchange: q.exchDisp ?? "",
    }));
}
