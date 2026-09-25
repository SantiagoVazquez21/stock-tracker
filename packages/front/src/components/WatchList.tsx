import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WatchSummary } from "@stock-tracker/shared";
import { getWatches, removeWatch } from "../api";

interface WatchListProps {
  selected: string | null;
  onSelect: (symbol: string) => void;
}

export function WatchList({ selected, onSelect }: WatchListProps) {
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
          onSelect={() => onSelect(w.symbol)}
        />
      ))}
    </ul>
  );
}

interface WatchCardProps {
  watch: WatchSummary;
  isSelected: boolean;
  onSelect: () => void;
}

function WatchCard({ watch, isSelected, onSelect }: WatchCardProps) {
  const pct = watch.pctSinceStart;
  const isUp = (pct ?? 0) >= 0;

  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeWatch(watch.symbol),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watches"] }),
  });

  // El borde va en el <li> para poder tener DOS botones adentro (seleccionar y
  // eliminar) sin anidarlos — anidar <button> dentro de <button> es HTML inválido.
  return (
    <li
      className={`flex items-center gap-1 rounded-xl border bg-surface pr-2 transition hover:bg-surface-2 ${
        isSelected ? "border-accent" : "border-line"
      }`}
    >
      <button
        onClick={onSelect}
        className="flex flex-1 items-center justify-between px-4 py-3 text-left"
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

      <button
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
        aria-label={`Dejar de seguir ${watch.symbol}`}
        title="Dejar de seguir"
        className="shrink-0 rounded-lg px-2 py-1 text-muted transition hover:text-down disabled:opacity-50"
      >
        ✕
      </button>
    </li>
  );
}
