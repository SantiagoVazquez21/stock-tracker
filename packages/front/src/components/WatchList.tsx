import { useQuery } from "@tanstack/react-query";
import type { WatchSummary } from "@stock-tracker/shared";
import { getWatches } from "../api";

interface WatchListProps {
  selected: string | null;
  onSelect: (symbol: string) => void;
}

export function WatchList({ selected, onSelect }: WatchListProps) {
  // useQuery maneja el fetch de lectura: cachea, y expone loading/error.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["watches"],
    queryFn: getWatches,
  });

  if (isLoading) {
    return <p className="text-sm text-muted">Cargando watchlist…</p>;
  }
  if (isError) {
    return (
      <p className="text-sm text-down">
        No se pudo cargar la watchlist. ¿Está el back corriendo?
      </p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted">
        Todavía no seguís nada. Agregá un símbolo arriba. 📈
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map((w) => (
        <WatchCard
          key={w.symbol}
          watch={w}
          isSelected={w.symbol === selected}
          onClick={() => onSelect(w.symbol)}
        />
      ))}
    </ul>
  );
}

interface WatchCardProps {
  watch: WatchSummary;
  isSelected: boolean;
  onClick: () => void;
}

function WatchCard({ watch, isSelected, onClick }: WatchCardProps) {
  const pct = watch.pctSinceStart;
  const isUp = (pct ?? 0) >= 0;

  return (
    <li>
      <button
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-xl border bg-surface px-4 py-3 text-left transition hover:bg-surface-2 ${
          isSelected ? "border-accent" : "border-line"
        }`}
      >
        <div>
          <p className="font-semibold">{watch.symbol}</p>
          <p className="text-xs text-muted">{watch.name}</p>
        </div>
        <div className="text-right tabular-nums">
          <p className="font-medium">
            {watch.lastClose != null ? `$${watch.lastClose.toFixed(2)}` : "—"}
          </p>
          <p
            className={`text-xs font-medium ${isUp ? "text-up" : "text-down"}`}
          >
            {pct != null ? `${isUp ? "+" : ""}${pct.toFixed(2)}%` : "—"}
          </p>
        </div>
      </button>
    </li>
  );
}
