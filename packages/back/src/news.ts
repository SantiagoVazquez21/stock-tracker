import { z } from "zod";
import type { NewsItem } from "@stock-tracker/shared";

// Feed general de mercado de Finnhub (una sola llamada, sin símbolo).
const FINNHUB_NEWS_URL = "https://finnhub.io/api/v1/news?category=general";

// Fuentes que consideramos "de gran relevancia". El match es por substring en
// minúsculas para tolerar variaciones ("Reuters", "www.reuters.com", etc.).
// Es una lista TUNEABLE: si el feed real queda muy vacío o muy ruidoso, se ajusta.
const SOURCE_ALLOWLIST = [
  "reuters",
  "bloomberg",
  "wsj",
  "wall street journal",
  "cnbc",
  "financial times",
  "barron",
  "marketwatch",
  "associated press",
  "the economist",
  "forbes",
];

// Palabras que suelen marcar noticias que mueven el mercado. Solo suben el
// puntaje (para ordenar/priorizar), no son un filtro por sí solas.
const KEYWORDS = [
  "earnings",
  "guidance",
  "upgrade",
  "downgrade",
  "merger",
  "acquisition",
  "fed",
  "interest rate",
  "inflation",
  "sec",
  "lawsuit",
  "bankruptcy",
  "ipo",
];

// Finnhub devuelve la fecha como unix (segundos) y `related` como CSV de tickers.
const RawNewsSchema = z.array(
  z.object({
    id: z.number(),
    headline: z.string(),
    summary: z.string().default(""),
    source: z.string().default(""),
    url: z.string(),
    datetime: z.number(),
    image: z.string().default(""),
    related: z.string().default(""),
  }),
);
type RawNews = z.infer<typeof RawNewsSchema>;

// Caché en memoria del feed crudo. Evita pegarle a Finnhub en cada request (y así
// aunque haya varios usuarios/polls, upstream recibe como mucho 1 llamada/minuto).
const CACHE_MS = 60_000;
let cache: { at: number; raw: RawNews } | null = null;

// Para tests: resetear el caché entre casos.
export function __clearNewsCache(): void {
  cache = null;
}

async function fetchRaw(apiKey: string): Promise<RawNews> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.raw;
  const res = await fetch(`${FINNHUB_NEWS_URL}&token=${apiKey}`, {
    headers: { "User-Agent": "stock-tracker" },
  });
  if (!res.ok) throw new Error(`Finnhub news respondió ${res.status}`);
  const raw = RawNewsSchema.parse(await res.json());
  cache = { at: Date.now(), raw };
  return raw;
}

// Devuelve las noticias de mercado más relevantes. `watchlist` sirve para taggear
// y priorizar las que tocan símbolos del usuario. Sin apiKey, devuelve [] (la
// feature degrada sola: el front muestra "sin noticias" en vez de romper).
export async function getMarketNews(
  apiKey: string | undefined,
  watchlist: string[],
  limit = 30,
): Promise<NewsItem[]> {
  if (!apiKey) return [];

  const raw = await fetchRaw(apiKey);
  const watch = new Set(watchlist.map((s) => s.toUpperCase()));
  const seen = new Set<string>();

  return (
    raw
      .map((n) => {
        const related = n.related
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);
        const matched = related.filter((t) => watch.has(t));
        const src = n.source.toLowerCase();
        const inAllowlist = SOURCE_ALLOWLIST.some((a) => src.includes(a));
        const text = `${n.headline} ${n.summary}`.toLowerCase();
        const keywordHits = KEYWORDS.filter((k) => text.includes(k)).length;
        // "Importante" = fuente seria O toca tu watchlist. Los keywords solo ordenan.
        const relevant = inAllowlist || matched.length > 0;
        return { n, matched, relevant, keywordHits };
      })
      .filter((x) => x.relevant)
      // Dedupe: la misma historia sale en muchos lados. Normalizo el título.
      .filter((x) => {
        const key = x.n.headline
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      // Más nuevas primero (es un feed "en vivo"); a igual fecha, más keywords arriba.
      .sort(
        (a, b) => b.n.datetime - a.n.datetime || b.keywordHits - a.keywordHits,
      )
      .slice(0, limit)
      .map(({ n, matched }) => ({
        id: String(n.id),
        headline: n.headline,
        summary: n.summary,
        source: n.source,
        url: n.url,
        datetime: new Date(n.datetime * 1000).toISOString(),
        image: n.image || null,
        related: matched,
      }))
  );
}
