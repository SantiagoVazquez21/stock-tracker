import { describe, it, expect } from "vitest";
import { updateSymbols } from "./worker";

describe("updateSymbols (actualiza varios tolerando fallos parciales)", () => {
  it("procesa los que andan aunque uno falle (Promise.allSettled)", async () => {
    // sync fake: "BAD" explota, los demás guardan 3 puntos.
    const sync = async (symbol: string) => {
      if (symbol === "BAD") throw new Error("falló la API");
      return 3;
    };

    const results = await updateSymbols(["AAPL", "BAD", "MSFT"], sync);

    // El que falló NO tira abajo a los demás: cada uno tiene su resultado.
    expect(results).toEqual([
      { symbol: "AAPL", ok: true, saved: 3 },
      { symbol: "BAD", ok: false, error: "Error: falló la API" },
      { symbol: "MSFT", ok: true, saved: 3 },
    ]);
  });
});
