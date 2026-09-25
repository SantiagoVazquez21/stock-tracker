import { useQuery } from "@tanstack/react-query";
import { getHistory, getQuote, getWatches } from "../api";
import { Monogram } from "./Sparkline";
import { PriceChart } from "./PriceChart";

// Panel de detalle del símbolo seleccionado (patrón master-detail: la fila de la
// tabla "maneja" este panel). Junta una grilla de stats derivadas de datos que YA
// tenemos cacheados (quote en vivo, resumen e historial) + el gráfico grande.
export function TickerDetail({ symbol }: { symbol: string }) {
  // Todas estas queries comparten key con las de la tabla / el chart, así que
  // TanStack Query reusa la caché: no se dispara red de más.
  const quote = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => getQuote(symbol),
    staleTime: 60_000,
  });
  const history = useQuery({
    queryKey: ["history", symbol],
    queryFn: () => getHistory(symbol),
  });
  const watches = useQuery({ queryKey: ["watches"], queryFn: getWatches });

  const summary = watches.data?.find((w) => w.symbol === symbol);
  const closes = history.data?.map((p) => p.close) ?? [];
  const max = closes.length ? Math.max(...closes) : null;
  const min = closes.length ? Math.min(...closes) : null;

  const dayPct = quote.data?.changePct ?? null;
  const sincePct = summary?.pctSinceStart ?? null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-3">
        <Monogram symbol={symbol} />
        <div>
          <h2 className="font-semibold leading-tight">{symbol}</h2>
          {quote.data?.name && (
            <p className="text-xs text-muted">{quote.data.name}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label="Precio"
          value={quote.data ? `$${quote.data.price.toFixed(2)}` : "—"}
        />
        <Stat label="Hoy" value={fmtPct(dayPct)} tone={toneOf(dayPct)} />
        <Stat
          label="Desde inicio"
          value={fmtPct(sincePct)}
          tone={toneOf(sincePct)}
        />
        <Stat
          label="Máx rango"
          value={max != null ? `$${max.toFixed(2)}` : "—"}
        />
        <Stat
          label="Mín rango"
          value={min != null ? `$${min.toFixed(2)}` : "—"}
        />
      </div>

      {summary?.startedAt && (
        <p className="mt-2 text-xs text-muted">
          Siguiéndolo desde el{" "}
          {new Date(summary.startedAt).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
      )}

      <PriceChart symbol={symbol} />
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-content";
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-1 font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function toneOf(pct: number | null): "up" | "down" | undefined {
  if (pct == null) return undefined;
  return pct >= 0 ? "up" : "down";
}

function fmtPct(pct: number | null): string {
  if (pct == null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}
