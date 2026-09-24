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
    const app = await buildServer({ source: fakeSource, logger: false });

    // inject simula un pedido HTTP en memoria: no abre puerto, no hace red.
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });

    await app.close();
  });

  it("devuelve el header CORS que autoriza al front", async () => {
    const app = await buildServer({ source: fakeSource, logger: false });

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

  it("NO autoriza a un origen desconocido", async () => {
    const app = await buildServer({ source: fakeSource, logger: false });

    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://sitio-malicioso.com" },
    });

    // Sin el header de autorización, el navegador de la víctima bloquea la respuesta.
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();

    await app.close();
  });
});

describe("POST /watches — validación de seguridad", () => {
  it("rechaza un símbolo con inyección de parámetros", async () => {
    const app = await buildServer({ source: fakeSource, logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/watches",
      payload: { symbol: "AAPL&apikey=robada" },
    });

    // 400 = frenado en la validación, ANTES de tocar la DB o la API externa.
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("rechaza un símbolo demasiado largo", async () => {
    const app = await buildServer({ source: fakeSource, logger: false });

    const res = await app.inject({
      method: "POST",
      url: "/watches",
      payload: { symbol: "A".repeat(5000) },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

describe("Rate limiting", () => {
  it("corta con 429 al superar el límite de pedidos", async () => {
    // Límite bajo (3) para probar rápido.
    const app = await buildServer({ source: fakeSource, logger: false, rateLimitMax: 3 });

    // Misma IP en todos para que el limiter los cuente juntos (inject no tiene
    // una IP de red real).
    const ip = "9.9.9.9";

    // Los primeros 3 pasan…
    for (let i = 0; i < 3; i++) {
      const ok = await app.inject({ method: "GET", url: "/health", remoteAddress: ip });
      expect(ok.statusCode).toBe(200);
    }
    // …el 4º queda bloqueado con 429 (Too Many Requests).
    const blocked = await app.inject({ method: "GET", url: "/health", remoteAddress: ip });
    expect(blocked.statusCode).toBe(429);

    await app.close();
  });
});

describe("Headers de seguridad (Helmet)", () => {
  it("incluye headers de endurecimiento HTTP", async () => {
    const app = await buildServer({ source: fakeSource, logger: false });

    const res = await app.inject({ method: "GET", url: "/health" });

    // nosniff impide que el navegador "adivine" el tipo de contenido (un vector
    // clásico de ataques). Es uno de los headers que agrega Helmet.
    expect(res.headers["x-content-type-options"]).toBe("nosniff");

    await app.close();
  });
});
