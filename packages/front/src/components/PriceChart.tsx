import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHistory } from "../api";

export function PriceChart({ symbol }: { symbol: string }) {
  // La query se cachea por símbolo (queryKey incluye el symbol): cambiar de
  // acción no re-pide lo ya cargado.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["history", symbol],
    queryFn: () => getHistory(symbol),
  });

  const box = "mt-6 rounded-xl border border-line bg-surface p-4";

  if (isLoading) {
    return <div className={box}><p className="text-sm text-muted">Cargando gráfico…</p></div>;
  }
  if (isError) {
    return <div className={box}><p className="text-sm text-down">No se pudo cargar el historial.</p></div>;
  }
  if (!data || data.length === 0) {
    return <div className={box}><p className="text-sm text-muted">Sin datos de historial todavía.</p></div>;
  }

  return (
    <div className={box}>
      <h2 className="mb-4 text-sm font-semibold">{symbol} · evolución del cierre</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
          <XAxis
            dataKey="date"
            stroke="var(--color-muted)"
            fontSize={11}
            tickMargin={8}
            minTickGap={40}
          />
          <YAxis
            stroke="var(--color-muted)"
            fontSize={11}
            width={52}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-line)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-muted)" }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, "Cierre"]}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
