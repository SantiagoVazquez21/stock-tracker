import { z } from "zod";
import type { AffectedTicker, NewsItem } from "@stock-tracker/shared";

// Marketaux: noticias financieras que YA vienen con análisis por entidad
// (relevancia + sentiment + a qué ticker afectan). Reemplaza a Finnhub como fuente.
const MARKETAUX_URL = "https://api.marketaux.com/v1/news/all";
// Free = 100 req/día y 3 artículos por request. Traigo 5 páginas (~15 noticias)
// para tener de dónde filtrar, y cacheo 75 min → 5 req cada 75 min ≈ 96/día.
const PAGES = 5;
const CACHE_MS = 75 * 60_000;

// Piso de relevancia (1-100): abajo de esto se descarta, SALVO que afecte a la
// watchlist del usuario (esas entran siempre). Cumple "solo lo muy importante".
const MIN_RELEVANCE = 50;

// Solo los campos que usamos (Marketaux devuelve más). Varios vienen nullables.
const EntitySchema = z.object({
  symbol: z.string().nullish(),
  name: z.string().nullish(),
  match_score: z.number().nullish(), // relevancia de la entidad en la nota
  sentiment_score: z.number().nullish(), // -1 a 1
});
const ArticleSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  snippet: z.string().nullish(),
  url: z.string(),
  image_url: z.string().nullish(),
  published_at: z.string(), // ISO
  source: z.string().default(""),
  entities: z.array(EntitySchema).default([]),
});
const ResponseSchema = z.object({ data: z.array(ArticleSchema).default([]) });
type Article = z.infer<typeof ArticleSchema>;

let cache: { at: number; articles: Article[] } | null = null;

// Para tests: resetear el caché entre casos.
export function __clearNewsCache(): void {
  cache = null;
}

async function fetchArticles(token: string): Promise<Article[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.articles;

  const pages = await Promise.all(
    Array.from({ length: PAGES }, (_, i) => i + 1).map(async (page) => {
      const url =
        `${MARKETAUX_URL}?api_token=${token}` +
        `&language=en&must_have_entities=true&filter_entities=true&limit=3&page=${page}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "stock-tracker" },
      });
      if (!res.ok) throw new Error(`Marketaux respondió ${res.status}`);
      return ResponseSchema.parse(await res.json()).data;
    }),
  );

  // Dedupe por uuid (por si dos páginas repiten un artículo).
  const seen = new Set<string>();
  const articles = pages.flat().filter((a) => {
    if (seen.has(a.uuid)) return false;
    seen.add(a.uuid);
    return true;
  });

  cache = { at: Date.now(), articles };
  return articles;
}

// Relevancia 1-100 = el mayor match_score entre las entidades del artículo.
// match_score suele venir 0-100, pero si viniera 0-1 lo escalo por las dudas.
function relevanceOf(article: Article): number {
  const top = article.entities.reduce(
    (m, e) => Math.max(m, e.match_score ?? 0),
    0,
  );
  const scaled = top <= 1 ? top * 100 : top;
  return Math.round(Math.min(100, Math.max(1, scaled)));
}

// Devuelve las noticias analizadas. `watchlist` sirve para marcar/priorizar las
// que afectan a los símbolos del usuario. Sin token → [] (feature degrada).
export async function getMarketNews(
  token: string | undefined,
  watchlist: string[],
  limit = 12,
): Promise<NewsItem[]> {
  if (!token) return [];

  const articles = await fetchArticles(token);
  const watch = new Set(watchlist.map((s) => s.toUpperCase()));

  const items: NewsItem[] = articles.map((a) => {
    const affected: AffectedTicker[] = a.entities
      .filter((e) => !!e.symbol)
      .sort((x, y) => (y.match_score ?? 0) - (x.match_score ?? 0))
      .slice(0, 4)
      .map((e) => {
        const symbol = String(e.symbol).toUpperCase();
        return {
          symbol,
          name: e.name ?? symbol,
          sentiment: e.sentiment_score ?? 0,
          inWatchlist: watch.has(symbol),
        };
      });

    return {
      id: a.uuid,
      headline: a.title,
      summary: a.description ?? a.snippet ?? "",
      source: a.source,
      url: a.url,
      datetime: a.published_at,
      image: a.image_url ?? null,
      relevance: relevanceOf(a),
      affected,
    };
  });

  // Filtro de relevancia: solo lo importante. Las que tocan tu watchlist entran
  // siempre (son relevantes para vos por definición, aunque el score sea bajo).
  const filtered = items.filter(
    (it) =>
      it.relevance >= MIN_RELEVANCE || it.affected.some((e) => e.inWatchlist),
  );

  // Orden: watchlist primero; luego mayor relevancia; a igual relevancia, más nueva.
  filtered.sort((a, b) => {
    const aw = a.affected.some((e) => e.inWatchlist) ? 1 : 0;
    const bw = b.affected.some((e) => e.inWatchlist) ? 1 : 0;
    if (aw !== bw) return bw - aw;
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
  });

  return filtered.slice(0, limit);
}
