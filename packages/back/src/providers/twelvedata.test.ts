import { describe, it, expect } from "vitest";
import { parseQuote } from "./twelvedata";

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
    const errorResponse = { code: 404, message: "symbol not found", status: "error" };

    expect(() => parseQuote(errorResponse)).toThrow();
  });
});
