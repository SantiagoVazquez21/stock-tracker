import { z } from "zod";
import type { Quote, MarketDataSource } from "@stock-tracker/shared";

const BASE_URL = "https://api.twelvedata.com";

// Esquema de la respuesta de /quote de Twelve Data, recortado a lo que usamos.
// Un esquema de Zod hace DOS cosas: valida en runtime y define el tipo.
// z.coerce.number() convierte los precios que vienen como string ("338.89")
// a number (338.89), y de paso valida que sean convertibles.
const QuoteSchema = z.object({
  symbol: z.string(),
  close: z.coerce.number(),
  percent_change: z.coerce.number(),
  timestamp: z.number(),
});

// Recibe algo "unknown" (no confiamos en lo que llega de afuera) y devuelve un
// Quote validado. Si la respuesta no tiene la forma esperada —por ejemplo el
// objeto de error de Twelve Data— .parse() tira un ZodError.
export function parseQuote(raw: unknown): Quote {
  const q = QuoteSchema.parse(raw);
  return {
    symbol: q.symbol,
    price: q.close,
    changePct: q.percent_change,
    asOf: new Date(q.timestamp * 1000),
  };
}

// Fábrica del proveedor. Recibe la API key (inyección de dependencias: no la
// va a buscar sola a process.env) y devuelve un objeto que cumple el contrato
// MarketDataSource. Migrar de Finnhub a Twelve Data = este archivo nuevo, sin
// tocar los tipos ni la interfaz.
export function createTwelveDataSource(apiKey: string): MarketDataSource {
  return {
    name: "TwelveData",

    supports(_symbol) {
      throw new Error("supports: todavía no implementado");
    },

    async getQuote(symbol) {
      const url = `${BASE_URL}/quote?symbol=${symbol}&apikey=${apiKey}`;
      const res = await fetch(url);

      // Error de transporte (4xx/5xx). Los errores que Twelve Data manda con
      // HTTP 200 los caza parseQuote vía Zod, así cubrimos las dos vías.
      if (!res.ok) {
        throw new Error(`Twelve Data respondió ${res.status} al pedir ${symbol}`);
      }

      const raw = await res.json();
      return parseQuote(raw);
    },

    getHistory(_symbol, _range) {
      throw new Error("getHistory: todavía no implementado");
    },
  };
}
