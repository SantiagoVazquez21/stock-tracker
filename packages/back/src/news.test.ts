import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMarketNews, __clearNewsCache } from "./news";

// Un artículo con la forma de Marketaux; cada test pisa lo que le importa.
function article(over: {
  uuid: string;
  title?: string;
  published_at?: string;
  source?: string;
  entities?: Array<{
    symbol?: string;
    name?: string;
    match_score?: number;
    sentiment_score?: number;
  }>;
}) {
  return {
    uuid: over.uuid,
    title: over.title ?? "Título",
    description: "",
    snippet: "",
    url: `https://example.com/${over.uuid}`,
    image_url: null,
    published_at: over.published_at ?? "2026-09-26T10:00:00Z",
    source: over.source ?? "Bloomberg",
    entities: over.entities ?? [],
  };
}

// Marketaux devuelve { data: [...] }. El mock responde lo mismo en cada página.
function mockFetch(data: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

beforeEach(() => __clearNewsCache());
afterEach(() => vi.unstubAllGlobals());

describe("getMarketNews (Marketaux)", () => {
  it("devuelve [] si no hay token (feature degrada, no rompe)", async () => {
    expect(await getMarketNews(undefined, [])).toEqual([]);
  });

  it("mapea relevancia y la acción afectada con su sentiment", async () => {
    mockFetch([
      article({
        uuid: "a1",
        title: "Apple soars on earnings",
        entities: [
          {
            symbol: "AAPL",
            name: "Apple Inc.",
            match_score: 85,
            sentiment_score: 0.6,
          },
        ],
      }),
    ]);
    const news = await getMarketNews("TOKEN", []);
    expect(news).toHaveLength(1);
    expect(news[0].relevance).toBe(85);
    expect(news[0].affected[0]).toEqual({
      symbol: "AAPL",
      name: "Apple Inc.",
      sentiment: 0.6,
      inWatchlist: false,
    });
  });

  it("normaliza el match_score 0-1 a escala 1-100", async () => {
    mockFetch([
      article({ uuid: "a2", entities: [{ symbol: "X", match_score: 0.9 }] }),
    ]);
    const news = await getMarketNews("TOKEN", []);
    expect(news[0].relevance).toBe(90);
  });

  it("marca inWatchlist y prioriza las noticias que tocan tu watchlist", async () => {
    mockFetch([
      article({
        uuid: "newer",
        title: "Nasdaq update",
        published_at: "2026-09-26T12:00:00Z",
        entities: [{ symbol: "NVDA", match_score: 50 }],
      }),
      article({
        uuid: "older",
        title: "Apple news",
        published_at: "2026-09-26T09:00:00Z",
        entities: [{ symbol: "AAPL", match_score: 40, sentiment_score: 0.2 }],
      }),
    ]);
    const news = await getMarketNews("TOKEN", ["AAPL"]);
    // La de AAPL primero aunque sea más vieja (afecta tu watchlist).
    expect(news[0].headline).toBe("Apple news");
    expect(news[0].affected[0].inWatchlist).toBe(true);
  });

  it("deduplica por uuid (las 3 páginas pueden repetir artículos)", async () => {
    mockFetch([article({ uuid: "dup", entities: [{ symbol: "MSFT" }] })]);
    const news = await getMarketNews("TOKEN", []);
    expect(news).toHaveLength(1);
  });
});
