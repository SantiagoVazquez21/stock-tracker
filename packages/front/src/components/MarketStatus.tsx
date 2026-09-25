import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWatches } from "../api";
import { usMarketStatus } from "../marketHours";

export function MarketStatus() {
  const [status, setStatus] = useState(() => usMarketStatus(new Date()));

  // Recalcula cada minuto (abre/cierra sin recargar).
  useEffect(() => {
    const id = setInterval(() => setStatus(usMarketStatus(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  const dot =
    status.tone === "open"
      ? "bg-up"
      : status.tone === "ext"
        ? "bg-accent"
        : "bg-muted";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      Mercado US:{" "}
      <span className="font-medium text-content">{status.label}</span>
    </span>
  );
}

// "Actualizado hace…": usa el timestamp de la última vez que TanStack Query
// refrescó la watchlist. Re-renderiza cada 30s para que el texto siga vivo.
export function UpdatedAgo() {
  const { dataUpdatedAt } = useQuery({
    queryKey: ["watches"],
    queryFn: getWatches,
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!dataUpdatedAt) return null;
  const secs = Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000));
  const txt =
    secs < 60
      ? `hace ${secs}s`
      : secs < 3600
        ? `hace ${Math.round(secs / 60)} min`
        : `hace ${Math.round(secs / 3600)} h`;

  return <span className="text-xs text-muted">Actualizado {txt}</span>;
}
