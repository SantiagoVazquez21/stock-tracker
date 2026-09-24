import { z } from "zod";
import type { Quote, Candle, Range, MarketDataSource } from "@stock-tracker/shared";

const BASE_URL = "https://api.twelvedata.com";

// Traduce nuestro Range al parámetro "outputsize" de Twelve Data (cuántos días
// de trading traer, aprox). Al tiparlo como Record<Range, number>, TS OBLIGA a
// cubrir todos los valores de Range: si mañana agregás "5Y" al tipo, TS marca
// acá que falta. El tipado te guía cuando extendés.
const RANGE_TO_SIZE: Record<Range, number> = {
  "1W": 5,
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
};

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

// Cada elemento del array "values" de /time_series. Ignoramos "volume" porque
// nuestro Candle no lo tiene (no modelamos lo que no usamos).
const CandleSchema = z.object({
  datetime: z.string(),
  open: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  close: z.coerce.number(),
});

// La respuesta entera de /time_series. Solo validamos "values" (lo que usamos);
// si viene el objeto de error de la API, no tiene "values" y .parse() falla.
const HistorySchema = z.object({
  values: z.array(CandleSchema),
});

// Devuelve las velas convertidas a number y ORDENADAS de más vieja a más nueva.
// Ordenar acá (y no confiar en el orden que mande la API) hace que quien dibuje
// el gráfico no tenga que preocuparse por eso: el historial siempre viene listo.
export function parseHistory(raw: unknown): Candle[] {
  const { values } = HistorySchema.parse(raw);
  return values
    .map((v) => ({
      date: v.datetime,
      open: v.open,
      high: v.high,
      low: v.low,
      close: v.close,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Fábrica del proveedor. Recibe la API key (inyección de dependencias: no la
// va a buscar sola a process.env) y devuelve un objeto que cumple el contrato
// MarketDataSource. Migrar de Finnhub a Twelve Data = este archivo nuevo, sin
// tocar los tipos ni la interfaz.
export function createTwelveDataSource(apiKey: string): MarketDataSource {
  return {
    name: "TwelveData",

    supports(symbol) {
      // Con un solo proveedor aceptamos cualquier símbolo no vacío y dejamos que
      // la API resuelva si existe. CARTEL: cuando sumemos el 2º proveedor
      // (Merval), acá va el routing real (qué símbolos cubre cada uno).
      return symbol.trim().length > 0;
    },

    async getQuote(symbol) {
      // encodeURIComponent: aunque el símbolo ya viene validado, codificarlo es
      // defensa en profundidad contra inyección de parámetros en la URL.
      const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const res = await fetch(url);

      // Error de transporte (4xx/5xx). Los errores que Twelve Data manda con
      // HTTP 200 los caza parseQuote vía Zod, así cubrimos las dos vías.
      if (!res.ok) {
        throw new Error(`Twelve Data respondió ${res.status} al pedir ${symbol}`);
      }

      const raw = await res.json();
      return parseQuote(raw);
    },

    async getHistory(symbol, range) {
      const outputsize = RANGE_TO_SIZE[range];
      const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${outputsize}&apikey=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Twelve Data respondió ${res.status} al pedir historial de ${symbol}`);
      }

      const raw = await res.json();
      return parseHistory(raw);
    },
  };
}
