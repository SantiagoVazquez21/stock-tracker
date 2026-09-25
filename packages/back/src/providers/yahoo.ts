import { z } from "zod";
import type {
  Quote,
  Candle,
  Range,
  MarketDataSource,
} from "@stock-tracker/shared";

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

// Nuestro Range → el parámetro "range" que entiende Yahoo.
const RANGE_TO_YAHOO: Record<Range, string> = {
  "1W": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
};

// La respuesta de Yahoo trae quote (meta) e history (arrays) en el mismo endpoint.
// Validamos SOLO lo que usamos de cada uno.
const QuoteResponseSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({
            symbol: z.string(),
            longName: z.string().optional(),
            shortName: z.string().optional(),
            regularMarketPrice: z.number(),
            regularMarketChangePercent: z.number(),
            regularMarketTime: z.number(),
          }),
        }),
      )
      .min(1),
  }),
});

export function parseQuote(raw: unknown): Quote {
  const { chart } = QuoteResponseSchema.parse(raw);
  const meta = chart.result[0].meta;
  return {
    symbol: meta.symbol,
    // Yahoo trae el nombre en longName o shortName; si no, usamos el símbolo.
    name: meta.longName ?? meta.shortName ?? meta.symbol,
    price: meta.regularMarketPrice,
    changePct: meta.regularMarketChangePercent,
    asOf: new Date(meta.regularMarketTime * 1000),
  };
}

// Yahoo da la serie como arrays PARALELOS: timestamp[i] va con close[i], etc.
// (formato muy distinto al de Twelve Data, y aun así encaja en el mismo Candle).
const HistoryResponseSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          timestamp: z.array(z.number()),
          indicators: z.object({
            quote: z
              .array(
                z.object({
                  open: z.array(z.number().nullable()),
                  high: z.array(z.number().nullable()),
                  low: z.array(z.number().nullable()),
                  close: z.array(z.number().nullable()),
                }),
              )
              .min(1),
          }),
        }),
      )
      .min(1),
  }),
});

export function parseHistory(raw: unknown): Candle[] {
  const { chart } = HistoryResponseSchema.parse(raw);
  const result = chart.result[0];
  const q = result.indicators.quote[0];

  const candles: Candle[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const open = q.open[i];
    const high = q.high[i];
    const low = q.low[i];
    const close = q.close[i];
    // Yahoo mete null en días sin dato (feriados, etc.): los salteamos.
    if (open == null || high == null || low == null || close == null) continue;
    candles.push({
      date: new Date(result.timestamp[i] * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
    });
  }
  return candles.sort((a, b) => a.date.localeCompare(b.date));
}

// Fábrica del proveedor Yahoo. No necesita API key (datos públicos).
export function createYahooSource(): MarketDataSource {
  async function fetchChart(symbol: string, range: string): Promise<unknown> {
    const url = `${BASE_URL}/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
    // Yahoo bloquea pedidos sin User-Agent.
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      throw new Error(`Yahoo respondió ${res.status} al pedir ${symbol}`);
    }
    return res.json();
  }

  return {
    name: "Yahoo",

    // Cubre los símbolos del Merval, que usamos con sufijo ".BA" (ej. GGAL.BA).
    supports(symbol) {
      return symbol.toUpperCase().endsWith(".BA");
    },

    async getQuote(symbol) {
      return parseQuote(await fetchChart(symbol, "1d"));
    },

    async getHistory(symbol, range) {
      return parseHistory(await fetchChart(symbol, RANGE_TO_YAHOO[range]));
    },
  };
}
