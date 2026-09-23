import { describe, it, expect } from "vitest";
import { buildServer } from "./server";

describe("GET /health", () => {
  it("responde 200 con status ok", async () => {
    const app = buildServer({ logger: false });

    // inject simula un pedido HTTP en memoria: no abre puerto, no hace red.
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });

    await app.close();
  });
});
