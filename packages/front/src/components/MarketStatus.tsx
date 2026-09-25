import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWatches } from "../api";

type Status = { label: string; tone: "open" | "closed" | "ext" };

// Estado del mercado US (NYSE/Nasdaq) según la hora de Nueva York. El truco de
// toLocaleString con timeZone deja que Intl maneje el horario de verano (DST).
// No contempla feriados (simplificación honesta) — por eso el label aclara "US".
function usMarketStatus(now: Date): Status {
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const day = et.getDay(); // 0 domingo … 6 sábado
  if (day === 0 || day === 6) return { label: "Cerrado", tone: "closed" };

  const mins = et.getHours() * 60 + et.getMinutes();
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const pre = 4 * 60;
  const after = 20 * 60;
  if (mins >= open && mins < close) return { label: "Abierto", tone: "open" };
  if (mins >= pre && mins < open) return { label: "Pre-market", tone: "ext" };
  if (mins >= close && mins < after)
    return { label: "After-hours", tone: "ext" };
  return { label: "Cerrado", tone: "closed" };
}

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
