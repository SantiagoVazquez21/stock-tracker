import type { MarketDataSource } from "@stock-tracker/shared";

// Combina varios proveedores en UNO solo. Para cada símbolo, elige el primer
// proveedor que lo soporta y le delega el pedido. El resto de la app habla con
// este registro como si fuera un único MarketDataSource — no sabe que por debajo
// hay varios. Sumar un proveedor nuevo = agregarlo a la lista, sin tocar nada más.
export function createRegistry(sources: MarketDataSource[]): MarketDataSource {
  function pick(symbol: string): MarketDataSource {
    const source = sources.find((s) => s.supports(symbol));
    if (!source) {
      throw new Error(`Ningún proveedor soporta el símbolo "${symbol}"`);
    }
    return source;
  }

  return {
    name: "registry",
    supports: (symbol) => sources.some((s) => s.supports(symbol)),
    // async para que, si pick() no encuentra proveedor, el error salga como una
    // promesa rechazada (y no un throw síncrono que rompería el contrato).
    getQuote: async (symbol) => pick(symbol).getQuote(symbol),
    getHistory: async (symbol, range) => pick(symbol).getHistory(symbol, range),
  };
}
