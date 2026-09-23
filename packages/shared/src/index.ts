// ┌──────────────────────────────────────────────────────────────────────┐
// │ paquete @stock-tracker/shared                                          │
// │ Fuente ÚNICA de los tipos. Front y back importan de acá para hablar    │
// │ el mismo idioma (tipos del dominio + contratos de la API).             │
// └──────────────────────────────────────────────────────────────────────┘

export interface Quote {
    symbol: string;
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
}

// Un punto del historial para el gráfico. Lo devuelve GET /watches/:symbol/history.
export interface HistoryPoint {
    date: string;
    close: number;
}