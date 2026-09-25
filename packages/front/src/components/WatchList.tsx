import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type { WatchSummary } from "@stock-tracker/shared";
import { getWatches, removeWatch } from "../api";
import { Monogram, Sparkline } from "./Sparkline";
import { Money, Pct } from "./AnimatedNumber";

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
    // Skeleton con shimmer, ya con forma de tabla (evita el salto de layout).
    return (
      <div className="overflow-hidden rounded-xl border border-line">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton h-14 border-b border-line last:border-b-0"
          />
        ))}
      </div>
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
        <svg
          viewBox="0 0 48 48"
          aria-hidden
          className="mx-auto h-12 w-12 text-muted"
        >
          <rect
            x="4"
            y="6"
            width="40"
            height="36"
            rx="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.5"
          />
          <path
            d="M10 31 L18 22 L24 27 L38 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="38" cy="13" r="2.6" fill="currentColor" />
        </svg>
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
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 text-left font-medium">Símbolo</th>
            <th className="px-4 py-2.5 text-right font-medium">Último</th>
            <th className="px-4 py-2.5 text-right font-medium">Desde inicio</th>
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
              Tendencia
            </th>
            <th className="w-10 px-2 py-2.5" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {/* AnimatePresence: mantiene la fila montada mientras hace su animación
              de salida (exit) al borrarla. La entrada va escalonada por índice. */}
          <AnimatePresence initial={true}>
            {data.map((w, i) => (
              <WatchRow
                key={w.symbol}
                watch={w}
                index={i}
                isSelected={w.symbol === selected}
                onSelect={() => onSelect(w.symbol)}
              />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

interface WatchRowProps {
  watch: WatchSummary;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function WatchRow({ watch, index, isSelected, onSelect }: WatchRowProps) {
  const pct = watch.pctSinceStart;
  const isUp = (pct ?? 0) >= 0;

  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removeWatch(watch.symbol),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watches"] }),
  });

  return (
    <motion.tr
      onClick={onSelect}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={`cursor-pointer border-b border-line transition-colors last:border-b-0 hover:bg-surface-2 ${
        isSelected ? "bg-surface-2" : ""
      }`}
    >
      {/* Celda del símbolo: un borde de color a la izquierda marca la fila activa. */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`-ml-4 mr-1 h-8 w-0.5 rounded-full ${
              isSelected ? "bg-accent" : "bg-transparent"
            }`}
          />
          <Monogram symbol={watch.symbol} />
          <div className="min-w-0">
            <p className="font-semibold">{watch.symbol}</p>
            <p className="truncate text-xs text-muted">{watch.name}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-right font-medium tabular-nums">
        {watch.lastClose != null ? <Money value={watch.lastClose} /> : "—"}
      </td>

      <td
        className={`px-4 py-3 text-right font-semibold tabular-nums ${
          isUp ? "text-up" : "text-down"
        }`}
      >
        {pct != null ? (
          <span>
            {isUp ? "▲" : "▼"} <Pct value={Math.abs(pct)} />
          </span>
        ) : (
          "—"
        )}
      </td>

      <td className="hidden px-4 py-3 sm:table-cell">
        <div className="flex justify-end">
          <Sparkline data={watch.spark} up={isUp} />
        </div>
      </td>

      <td className="px-2 py-3 text-right">
        <motion.button
          onClick={(e) => {
            e.stopPropagation(); // no seleccionar la fila al borrar
            remove.mutate();
          }}
          whileTap={{ scale: 0.9 }}
          disabled={remove.isPending}
          aria-label={`Dejar de seguir ${watch.symbol}`}
          title="Dejar de seguir"
          className="rounded-lg px-2 py-1 text-muted transition hover:text-down disabled:opacity-50"
        >
          ✕
        </motion.button>
      </td>
    </motion.tr>
  );
}
