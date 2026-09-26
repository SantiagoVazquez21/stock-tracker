import { z } from "zod";
import type { NewsItem } from "@stock-tracker/shared";

// Feed general de Finnhub. OJO: "general" trae MUCHO más que mercado (política,
// mundo, lifestyle), así que el filtro de abajo es el que hace el trabajo fino.
const FINNHUB_NEWS_URL = "https://finnhub.io/api/v1/news?category=general";

// Fuentes serias (match por substring en minúsculas, tolera "Reuters" / "reuters.com").
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

// Términos que marcan que una nota ES de mercado/negocios. Acá SÍ filtran: una nota
// de Reuters sobre la ONU no tiene ninguno → se descarta. Lista TUNEABLE.
const MARKET_KEYWORDS = [
  "stock",
  "shares",
  "stock market",
  "markets", // plural a propósito: NO matchea "job market" (singular)
  "nasdaq",
  "dow jones",
  "s&p",
  "wall street",
  "earnings",
  "revenue",
  "profit",
  "guidance",
  "forecast",
  "outlook",
  "dividend",
  "buyback",
  "ipo",
  "merger",
  "acquisition",
  "takeover",
  "antitrust",
  "bankruptcy",
  "layoffs",
  "fed",
  "federal reserve",
  "interest rate",
  "rate cut",
  "rate hike",
  "inflation",
  "cpi",
  "gdp",
  "treasury",
  "bond yield",
  "downgrade",
  "upgrade",
  "analyst",
  "valuation",
  "etf",
  "selloff",
  "quarterly",
  "shareholder",
  "semiconductor",
  "crude",
  "tariff",
];

// Temas RUIDO: si aparecen, la nota se descarta aunque matchee algo de mercado.
// Sacan lifestyle/carrera (CNBC publica mucho) y geopolítica pura. Lista TUNEABLE.
const DENYLIST = [
  "job market",
  "hiring",
  "career",
  "side hustle",
  "how i ",
  "i tried",
  "things to do",
  "recipe",
  "run club",
  "workout",
  "horoscope",
  "celebrity",
  "royal",
  "vacation",
  "diplomacy",
  "united nations",
  "un speech",
  "summit",
  "missile",
  "houthi",
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
        const isMarket =
          related.length > 0 || MARKET_KEYWORDS.some((k) => text.includes(k));
        const denied = DENYLIST.some((k) => text.includes(k));
        // "Importante y de mercado" = toca tu watchlist, O (fuente seria Y es una
        // nota de mercado). La denylist descarta ruido (lifestyle/geopolítica)
        // aunque haya matcheado algo. Con esto se caen política/mundo/lifestyle.
        const relevant =
          !denied && (matched.length > 0 || (inAllowlist && isMarket));
        return { n, matched, relevant };
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
      // Primero las de tu watchlist; dentro de cada grupo, las más nuevas arriba.
      .sort(
        (a, b) =>
          Number(b.matched.length > 0) - Number(a.matched.length > 0) ||
          b.n.datetime - a.n.datetime,
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
