// ┌──────────────────────────────────────────────────────────────────────┐
// │ paquete @stock-tracker/shared                                          │
// │ Fuente ÚNICA de los tipos del dominio. Front y back importan de acá.   │
// │                                                                        │
// │ Por ahora esto es solo un placeholder para probar que el monorepo      │
// │ está bien cableado. En el próximo paso lo REEMPLAZÁS VOS con los tipos │
// │ reales: Quote, Candle, Range y la interfaz MarketDataSource.           │
// └──────────────────────────────────────────────────────────────────────┘

export const SHARED_OK = "shared conectado";

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