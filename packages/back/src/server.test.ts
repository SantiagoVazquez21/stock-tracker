import { describe, it, expect } from "vitest";
import type { MarketDataSource } from "@stock-tracker/shared";
import { buildServer } from "./server";

// Proveedor de mentira: /health no lo usa, pero buildServer lo pide.
// (Para testear los endpoints que SÍ tocan la DB/proveedor haremos falsos
// más completos en la etapa de tests con fixtures.)
const fakeSource: MarketDataSource = {
  name: "fake",
  supports: () => true,
  getQuote: async () => {
    throw new Error("no usado en este test");
  },
  getHistory: async () => [],
};

describe("GET /health", () => {
  it("responde 200 con status ok", async () => {
    const app = buildServer({ source: fakeSource, logger: false });

    // inject simula un pedido HTTP en memoria: no abre puerto, no hace red.
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });

    await app.close();
  });

  it("devuelve el header CORS que autoriza al front", async () => {
    const app = buildServer({ source: fakeSource, logger: false });

    // Simulamos un pedido desde el origen del front. Con CORS bien configurado,
    // el back responde autorizando ese origen.
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:5174" },
    });

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5174",
    );

    await app.close();
  });
});
