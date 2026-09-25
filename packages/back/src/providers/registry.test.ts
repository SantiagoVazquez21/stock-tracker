import { describe, it, expect } from "vitest";
import type { MarketDataSource } from "@stock-tracker/shared";
import { createRegistry } from "./registry";

// Proveedor de mentira: soporta según supportsFn y devuelve un price fijo, para
// poder distinguir CUÁL proveedor respondió.
function fakeSource(
  name: string,
  supportsFn: (s: string) => boolean,
  price: number,
): MarketDataSource {
  return {
    name,
    supports: supportsFn,
    getQuote: async (symbol) => ({
      symbol,
      price,
      changePct: 0,
      asOf: new Date(0),
    }),
    getHistory: async () => [],
  };
}

describe("createRegistry (elige proveedor por supports)", () => {
  const us = fakeSource("US", (s) => !s.endsWith(".BA"), 100);
  const ar = fakeSource("AR", (s) => s.endsWith(".BA"), 200);

  it("delega en el proveedor correcto según el símbolo", async () => {
    const registry = createRegistry([us, ar]);

    // price 100 = respondió US; price 200 = respondió AR.
    expect((await registry.getQuote("AAPL")).price).toBe(100);
    expect((await registry.getQuote("GGAL.BA")).price).toBe(200);
  });

  it("tira error si ningún proveedor soporta el símbolo", async () => {
    const registry = createRegistry([ar]); // solo el argentino

    await expect(registry.getQuote("AAPL")).rejects.toThrow();
  });
});
