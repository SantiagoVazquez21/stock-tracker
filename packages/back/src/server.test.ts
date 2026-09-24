import { describe, it, expect } from "vitest";
import type { MarketDataSource } from "@stock-tracker/shared";
import { buildServer } from "./server";

const fakeSource: MarketDataSource = {
  name: "fake",
  supports: () => true,
  getQuote: async () => {
    throw new Error("no usado en este test");
  },
  getHistory: async () => [],
};

const JWT_SECRET = "test-secret-1234567890";

// Crea la app lista para test y un token válido (firma solo; jwtVerify no toca
// la DB, así que un id inventado alcanza para probar rutas protegidas).
async function makeApp(rateLimitMax?: number) {
  const app = await buildServer({
    source: fakeSource,
    jwtSecret: JWT_SECRET,
    logger: false,
    rateLimitMax,
  });
  await app.ready();
  const token = app.jwt.sign({ id: 1 });
  return { app, token };
}

describe("GET /health", () => {
  it("responde 200 con status ok", async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });

  it("devuelve el header CORS que autoriza al front", async () => {
    const { app } = await makeApp();
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:5174" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
    await app.close();
  });

  it("NO autoriza a un origen desconocido", async () => {
    const { app } = await makeApp();
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://sitio-malicioso.com" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });

  it("incluye headers de seguridad (Helmet)", async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    await app.close();
  });
});

describe("Autenticación", () => {
  it("rechaza el acceso a /watches sin token (401)", async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: "GET", url: "/watches" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe("POST /watches — validación de seguridad (autenticado)", () => {
  it("rechaza un símbolo con inyección de parámetros", async () => {
    const { app, token } = await makeApp();
    const res = await app.inject({
      method: "POST",
      url: "/watches",
      cookies: { token },
      payload: { symbol: "AAPL&apikey=robada" },
    });
    // 400 = pasó la auth pero lo frenó la validación, antes de tocar DB/API.
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("rechaza un símbolo demasiado largo", async () => {
    const { app, token } = await makeApp();
    const res = await app.inject({
      method: "POST",
      url: "/watches",
      cookies: { token },
      payload: { symbol: "A".repeat(5000) },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe("Rate limiting", () => {
  it("corta con 429 al superar el límite de pedidos", async () => {
    const { app } = await makeApp(3);
    const ip = "9.9.9.9";
    for (let i = 0; i < 3; i++) {
      const ok = await app.inject({ method: "GET", url: "/health", remoteAddress: ip });
      expect(ok.statusCode).toBe(200);
    }
    const blocked = await app.inject({ method: "GET", url: "/health", remoteAddress: ip });
    expect(blocked.statusCode).toBe(429);
    await app.close();
  });
});
