import { describe, it, expect, vi, afterEach } from "vitest";
import { parseQuote, parseHistory, createYahooSource } from "./yahoo";

describe("parseQuote (Yahoo → Quote)", () => {
  it("extrae precio, % del día y fecha desde meta", () => {
    const raw = {
      chart: {
        result: [
          {
            meta: {
              symbol: "GGAL.BA",
              longName: "Grupo Financiero Galicia S.A.",
              regularMarketPrice: 6415,
              regularMarketChangePercent: -0.465,
              regularMarketTime: 1790268755,
            },
          },
        ],
      },
    };

    expect(parseQuote(raw)).toEqual({
      symbol: "GGAL.BA",
      name: "Grupo Financiero Galicia S.A.",
      price: 6415,
      changePct: -0.465,
      asOf: new Date(1790268755 * 1000),
    });
  });

  it("rechaza una respuesta de error (sin result)", () => {
    const errorResponse = {
      chart: { result: null, error: { description: "Not Found" } },
    };
    expect(() => parseQuote(errorResponse)).toThrow();
  });
});

describe("parseHistory (Yahoo → Candle[])", () => {
  it("combina timestamp y OHLC en velas ordenadas", () => {
    const raw = {
      chart: {
        result: [
          {
            timestamp: [1789740000, 1789826400],
            indicators: {
              quote: [
                {
                  open: [6700, 6690],
                  high: [6720, 6700],
                  low: [6650, 6640],
                  close: [6685, 6665],
                },
              ],
            },
          },
        ],
      },
    };

    expect(parseHistory(raw)).toEqual([
      {
        date: new Date(1789740000 * 1000).toISOString().slice(0, 10),
        open: 6700,
        high: 6720,
        low: 6650,
        close: 6685,
      },
      {
        date: new Date(1789826400 * 1000).toISOString().slice(0, 10),
        open: 6690,
        high: 6700,
        low: 6640,
        close: 6665,
      },
    ]);
  });

  it("saltea los días con datos nulos (Yahoo mete null a veces)", () => {
    const raw = {
      chart: {
        result: [
          {
            timestamp: [1789740000, 1789826400],
            indicators: {
              quote: [
                {
                  open: [6700, null],
                  high: [6720, null],
                  low: [6650, null],
                  close: [6685, null],
                },
              ],
            },
          },
        ],
      },
    };

    expect(parseHistory(raw)).toHaveLength(1);
  });
});

describe("createYahooSource getQuote (con fetch mockeado)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("manda User-Agent y devuelve el Quote parseado", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chart: {
          result: [
            {
              meta: {
                symbol: "GGAL.BA",
                longName: "Grupo Galicia",
                regularMarketPrice: 6415,
                regularMarketChangePercent: -0.5,
                regularMarketTime: 1000,
              },
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const source = createYahooSource();
    const quote = await source.getQuote("GGAL.BA");

    expect(quote.name).toBe("Grupo Galicia");
    expect(quote.price).toBe(6415);
    // Yahoo bloquea pedidos sin User-Agent: verificamos que lo mandamos.
    const opts = mockFetch.mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(opts.headers["User-Agent"]).toBeTruthy();
  });
});
