import { describe, it, expect } from "vitest";
import { parseQuote, parseHistory, createTwelveDataSource } from "./twelvedata";

describe("parseQuote (Twelve Data → Quote)", () => {
  it("convierte los precios de string a number y arma la fecha", () => {
    // Respuesta cruda de Twelve Data, recortada a lo que usamos.
    // Ojo: los precios vienen como STRING, y esperamos que salgan como NUMBER.
    const raw = {
      symbol: "AAPL",
      close: "338.89001",
      percent_change: "0.82111377",
      timestamp: 1789997400,
    };

    expect(parseQuote(raw)).toEqual({
      symbol: "AAPL",
      price: 338.89001,
      changePct: 0.82111377,
      asOf: new Date(1789997400 * 1000),
    });
  });

  it("rechaza una respuesta que no tiene la forma esperada", () => {
    // Twelve Data devuelve errores como { code, message, status } — a veces con
    // HTTP 200. parseQuote NO debe tragarse eso: tiene que tirar error.
    const errorResponse = {
      code: 404,
      message: "symbol not found",
      status: "error",
    };

    expect(() => parseQuote(errorResponse)).toThrow();
  });
});

describe("parseHistory (Twelve Data → Candle[])", () => {
  it("convierte a number y ordena de más viejo a más nuevo", () => {
    // La API manda los values DESCENDENTE (más nuevo primero) y como strings.
    // Esperamos: convertidos a number, sin volume, y ASCENDENTE (viejo → nuevo).
    const raw = {
      meta: { symbol: "AAPL" },
      values: [
        {
          datetime: "2026-09-21",
          open: "335.20",
          high: "339.64",
          low: "333.04",
          close: "338.98",
          volume: "34913171",
        },
        {
          datetime: "2026-09-18",
          open: "337.91",
          high: "338.48",
          low: "332.53",
          close: "336.13",
          volume: "86433100",
        },
      ],
      status: "ok",
    };

    expect(parseHistory(raw)).toEqual([
      {
        date: "2026-09-18",
        open: 337.91,
        high: 338.48,
        low: 332.53,
        close: 336.13,
      },
      {
        date: "2026-09-21",
        open: 335.2,
        high: 339.64,
        low: 333.04,
        close: 338.98,
      },
    ]);
  });

  it("rechaza una respuesta sin values (objeto de error)", () => {
    const errorResponse = {
      code: 400,
      message: "bad request",
      status: "error",
    };

    expect(() => parseHistory(errorResponse)).toThrow();
  });
});

describe("createTwelveDataSource / supports", () => {
  it("acepta un símbolo no vacío y rechaza el vacío", () => {
    // Sin .env ni red: la inyección de la key hace que se pueda testear directo.
    const source = createTwelveDataSource("key-de-mentira");

    expect(source.supports("AAPL")).toBe(true);
    expect(source.supports("   ")).toBe(false);
  });
});
