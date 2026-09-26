import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMarketNews, __clearNewsCache } from "./news";

// Un item crudo de Finnhub con defaults; cada test pisa lo que le importa.
function raw(over: Partial<Record<string, unknown>> & { id: number }) {
  return {
    id: over.id,
    headline: over.headline ?? "Stocks rally on the day",
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

describe("getMarketNews (filtro de relevancia de mercado)", () => {
  it("devuelve [] si no hay API key (feature degrada, no rompe)", async () => {
    expect(await getMarketNews(undefined, [])).toEqual([]);
  });

  it("descarta noticias que NO son de mercado aunque la fuente sea seria", async () => {
    mockFetch([
      // Reuters, pero es política/mundo → sin términos de mercado ni ticker → fuera.
      raw({ id: 1, headline: "China pushes back at US in UN speech" }),
      // Reuters y sí es de mercado → queda.
      raw({ id: 2, headline: "Fed holds interest rate steady" }),
    ]);
    const news = await getMarketNews("KEY", []);
    expect(news).toHaveLength(1);
    expect(news[0].headline).toBe("Fed holds interest rate steady");
  });

  it("descarta noticias de mercado si la fuente NO es seria", async () => {
    mockFetch([
      raw({ id: 3, headline: "Stocks rally big", source: "RandomBlog" }),
    ]);
    expect(await getMarketNews("KEY", [])).toHaveLength(0);
  });

  it("incluye y taggea las que tocan la watchlist, aun de fuente no seria", async () => {
    mockFetch([
      raw({
        id: 4,
        headline: "Company ships a thing",
        source: "SomeBlog",
        related: "AAPL,MSFT",
      }),
    ]);
    const news = await getMarketNews("KEY", ["AAPL"]);
    expect(news).toHaveLength(1);
    // Solo taggea los tickers que el usuario sigue (AAPL, no MSFT).
    expect(news[0].related).toEqual(["AAPL"]);
  });

  it("mantiene notas taggeadas a un ticker desde fuente seria aunque no tengan keyword", async () => {
    mockFetch([
      raw({
        id: 5,
        headline: "Apple faces patent verdict",
        source: "CNBC",
        related: "AAPL",
      }),
    ]);
    // Sin watchlist: no hay tag, pero al estar taggeada a un ticker y ser fuente
    // seria, se considera de mercado y queda.
    const news = await getMarketNews("KEY", []);
    expect(news).toHaveLength(1);
    expect(news[0].related).toEqual([]);
  });

  it("deduplica la misma historia por título normalizado", async () => {
    mockFetch([
      raw({ id: 6, headline: "Stocks rally today", source: "Reuters" }),
      raw({ id: 7, headline: "stocks  rally today!", source: "Bloomberg" }),
    ]);
    expect(await getMarketNews("KEY", [])).toHaveLength(1);
  });

  it("prioriza las de la watchlist y, dentro de cada grupo, las más nuevas", async () => {
    mockFetch([
      raw({ id: 8, headline: "Nasdaq slips", datetime: 5000 }),
      raw({
        id: 9,
        headline: "AAPL earnings beat",
        datetime: 1000,
        related: "AAPL",
      }),
    ]);
    const news = await getMarketNews("KEY", ["AAPL"]);
    // La de AAPL primero aunque sea más vieja (es de la watchlist).
    expect(news.map((n) => n.headline)).toEqual([
      "AAPL earnings beat",
      "Nasdaq slips",
    ]);
  });

  it("convierte el datetime unix a ISO", async () => {
    mockFetch([
      raw({ id: 10, headline: "Stocks rally continues", datetime: 1700000000 }),
    ]);
    const news = await getMarketNews("KEY", []);
    expect(news[0].datetime).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it("descarta ruido de la denylist (lifestyle/carrera) aunque la fuente sea seria", async () => {
    mockFetch([
      raw({
        id: 11,
        headline: "The iced coffee debate and everything wrong with hiring",
      }),
      raw({ id: 12, headline: "How I built a $640K side hustle run club" }),
    ]);
    expect(await getMarketNews("KEY", [])).toHaveLength(0);
  });

  it('no cuenta "job market" como noticia de mercado', async () => {
    mockFetch([
      raw({ id: 13, headline: "The blue-collar AI job market is booming" }),
    ]);
    expect(await getMarketNews("KEY", [])).toHaveLength(0);
  });
});
