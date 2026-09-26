// ┌──────────────────────────────────────────────────────────────────────┐
// │ paquete @stock-tracker/shared                                          │
// │ Fuente ÚNICA de los tipos. Front y back importan de acá para hablar    │
// │ el mismo idioma (tipos del dominio + contratos de la API).             │
// └──────────────────────────────────────────────────────────────────────┘

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  asOf: Date;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type Range = "1W" | "1M" | "3M" | "6M" | "1Y";

export interface MarketDataSource {
  name: string;
  supports(symbol: string): boolean;
  getQuote(symbol: string): Promise<Quote>;
  getHistory(symbol: string, range: Range): Promise<Candle[]>;
}

// ── Contratos de la API (lo que viaja por HTTP entre back y front) ──────────
// Las fechas van como string ISO porque JSON no tiene tipo Date.

// Una fila de la watchlist con su "% desde que empecé". Lo devuelve GET /watches.
export interface WatchSummary {
  symbol: string;
  name: string;
  startedAt: string;
  startClose: number | null;
  lastClose: number | null;
  lastDate: string | null;
  pctSinceStart: number | null;
  // Últimos ~30 cierres (viejo → nuevo) para dibujar el sparkline de la fila.
  // Va en el mismo resumen para evitar un pedido por símbolo (N+1) desde el front.
  spark: number[];
}

// Un punto del historial para el gráfico. Lo devuelve GET /watches/:symbol/history.
export interface HistoryPoint {
  date: string;
  close: number;
}

// El usuario autenticado (sin datos sensibles). Lo devuelven register/login/me.
export interface AuthUser {
  id: number;
  email: string;
}

// Un resultado del buscador de símbolos. Lo devuelve GET /search?q=...
export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

// Una acción afectada por una noticia, con su sentiment (-1 a 1: <0 negativo,
// >0 positivo). inWatchlist = el usuario la sigue (para resaltarla en el panel).
export interface AffectedTicker {
  symbol: string;
  name: string;
  sentiment: number;
  inWatchlist: boolean;
}

// Una noticia de mercado ya analizada. La devuelve GET /news.
export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: string; // ISO (JSON no tiene Date)
  image: string | null;
  relevance: number; // 1-100: qué tan relevante es la noticia
  affected: AffectedTicker[]; // a qué acción(es) afecta y en qué signo
}
