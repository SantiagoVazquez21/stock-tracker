import { useQuery } from "@tanstack/react-query";
import type { WatchSummary } from "@stock-tracker/shared";
import { getWatches } from "../api";

// Tira de "stat tiles" arriba de la tabla: el resumen de la cartera de un vistazo.
// Lee la MISMA query ["watches"] que la tabla (cacheada por TanStack Query), así
// que no dispara pedidos extra: solo deriva números de lo que ya está en memoria.
export function SummaryStrip() {
  const { data } = useQuery({ queryKey: ["watches"], queryFn: getWatches });

  // Sin datos todavía (o watchlist vacía) → no mostramos la tira.
  if (!data || data.length === 0) return null;

  const withPct = data.filter(
    (w): w is WatchSummary & { pctSinceStart: number } =>
      w.pctSinceStart != null,
  );
  const up = withPct.filter((w) => w.pctSinceStart >= 0).length;
  const down = withPct.length - up;

  // Mejor performer desde que se empezó a trackear.
  const best = [...withPct].sort(
    (a, b) => b.pctSinceStart - a.pctSinceStart,
  )[0];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="Siguiendo" value={String(data.length)} />
      <Tile label="En alza" value={String(up)} tone="up" />
      <Tile label="En baja" value={String(down)} tone="down" />
      {best && (
        <Tile
          label="Mejor"
          value={best.symbol}
          hint={`${best.pctSinceStart >= 0 ? "+" : ""}${best.pctSinceStart.toFixed(1)}%`}
          tone={best.pctSinceStart >= 0 ? "up" : "down"}
        />
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-content";
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-xl font-semibold ${toneClass}`}>{value}</span>
        {hint && (
          <span className={`text-xs font-medium ${toneClass}`}>{hint}</span>
        )}
      </div>
    </div>
  );
}
