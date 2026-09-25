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

  // Skeleton: unas tarjetas "fantasma" que pulsan mientras carga. Se siente más
  // pulido que un texto "Cargando…" y evita el salto de layout.
  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-[70px] animate-pulse rounded-xl border border-line bg-surface"
          />
        ))}
      </ul>
    );
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
      <div className="rounded-xl border border-dashed border-line px-4 py-12 text-center">
        <p className="text-3xl">📈</p>
        <p className="mt-3 font-medium">Tu watchlist está vacía</p>
        <p className="mt-1 text-sm text-muted">
          Buscá una acción arriba (ej.{" "}
          <span className="text-content">AAPL</span> o{" "}
          <span className="text-content">Apple</span>) para empezar a seguirla.
        </p>
      </div>
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

  // El borde va en el <li> para tener DOS botones adentro (seleccionar y
  // eliminar) sin anidarlos — anidar <button> dentro de <button> es inválido.
  return (
    <li
      className={`flex items-center gap-1 rounded-xl border bg-surface pr-2 transition hover:bg-surface-2 ${
        isSelected ? "border-accent" : "border-line"
      }`}
    >
      <button
        onClick={onSelect}
        className="flex flex-1 items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="font-semibold">{watch.symbol}</p>
          <p className="truncate text-xs text-muted">{watch.name}</p>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p className="text-base font-semibold">
            {watch.lastClose != null ? `$${watch.lastClose.toFixed(2)}` : "—"}
          </p>
          <p
            className={`text-xs font-semibold ${isUp ? "text-up" : "text-down"}`}
          >
            {pct != null
              ? `${isUp ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`
              : "—"}
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
