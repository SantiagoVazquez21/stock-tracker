import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMarketNews, __clearNewsCache } from "./news";

// Un item crudo de Finnhub con defaults; cada test pisa lo que le importa.
function raw(over: Partial<Record<string, unknown>> & { id: number }) {
  return {
    id: over.id,
    headline: over.headline ?? "Headline",
    source: over.source ?? "Reuters",
    url: over.url ?? `https://example.com/${over.id}`,
    datetime: over.datetime ?? 1000,
    image: over.image ?? "",
    related: over.related ?? "",
    summary: over.summary ?? "",
  };
}

function mockFetch(items: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(items), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

beforeEach(() => __clearNewsCache());
afterEach(() => vi.unstubAllGlobals());

describe("getMarketNews (filtro de relevancia)", () => {
  it("devuelve [] si no hay API key (feature degrada, no rompe)", async () => {
    expect(await getMarketNews(undefined, [])).toEqual([]);
  });

  it("deja solo fuentes serias y descarta el resto", async () => {
    mockFetch([
      raw({ id: 1, headline: "Fed raises rates", source: "Reuters" }),
      raw({ id: 2, headline: "Random blog post", source: "SomeBlog" }),
    ]);
    const news = await getMarketNews("KEY", []);
    expect(news).toHaveLength(1);
    expect(news[0].source).toBe("Reuters");
  });

  it("incluye y taggea noticias que tocan la watchlist, aunque la fuente no esté en la lista", async () => {
    mockFetch([
      raw({
        id: 3,
        headline: "Apple ships a thing",
        source: "SomeBlog",
        related: "AAPL,MSFT",
      }),
    ]);
    const news = await getMarketNews("KEY", ["AAPL"]);
    expect(news).toHaveLength(1);
    // Solo taggea los tickers que el usuario sigue (AAPL, no MSFT).
    expect(news[0].related).toEqual(["AAPL"]);
  });

  it("deduplica la misma historia por título normalizado", async () => {
    mockFetch([
      raw({ id: 4, headline: "Same Story", source: "Reuters", datetime: 2000 }),
      raw({
        id: 5,
        headline: "same  story!",
        source: "Bloomberg",
        datetime: 1000,
      }),
    ]);
    const news = await getMarketNews("KEY", []);
    expect(news).toHaveLength(1);
  });

  it("ordena de más nueva a más vieja", async () => {
    mockFetch([
      raw({ id: 6, headline: "Old", source: "Reuters", datetime: 1000 }),
      raw({ id: 7, headline: "New", source: "Reuters", datetime: 5000 }),
    ]);
    const news = await getMarketNews("KEY", []);
    expect(news.map((n) => n.headline)).toEqual(["New", "Old"]);
  });

  it("convierte el datetime unix a ISO", async () => {
    mockFetch([raw({ id: 8, source: "Reuters", datetime: 1700000000 })]);
    const news = await getMarketNews("KEY", []);
    expect(news[0].datetime).toBe(new Date(1700000000 * 1000).toISOString());
  });
});
