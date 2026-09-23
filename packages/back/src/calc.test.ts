import { describe, it, expect } from "vitest";
import { pctChange } from "./calc";

describe("pctChange (variación porcentual entre dos precios)", () => {
  it("calcula la suba", () => {
    expect(pctChange(100, 112)).toBe(12); // de 100 a 112 = +12%
  });

  it("calcula la baja", () => {
    expect(pctChange(200, 150)).toBe(-25); // de 200 a 150 = -25%
  });

  it("da 0 cuando el precio no cambió", () => {
    expect(pctChange(100, 100)).toBe(0);
  });

  it("da 0 si el precio inicial es 0 (evita dividir por cero)", () => {
    expect(pctChange(0, 100)).toBe(0);
  });
});
