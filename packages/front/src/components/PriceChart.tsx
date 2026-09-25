import { useState } from "react";
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
import { getHistory, getQuote } from "../api";

// Cada rango = cuántos días (de trading) del final mostramos.
const RANGES = { "1S": 5, "1M": 22, "3M": 66, "6M": 132, "1A": 252 } as const;
type RangeKey = keyof typeof RANGES;

export function PriceChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<RangeKey>("3M");

  const history = useQuery({
    queryKey: ["history", symbol],
    queryFn: () => getHistory(symbol),
  });

  // Precio EN VIVO. staleTime 60s: no vuelve a pedirlo en cada render.
  const quote = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => getQuote(symbol),
    staleTime: 60_000,
  });

  const box = "mt-6 rounded-xl border border-line bg-surface p-4";
  const up = (quote.data?.changePct ?? 0) >= 0;

  // Recortamos el historial ya cargado a los últimos N puntos del rango elegido.
  const points = history.data?.slice(-RANGES[range]) ?? [];

  return (
    <div className={box}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {symbol} <span className="font-normal text-muted">· evolución</span>
        </h2>
        {quote.data && (
          <div className="tabular-nums">
            <span className="font-semibold">
              ${quote.data.price.toFixed(2)}
            </span>{" "}
            <span
              className={`text-xs font-medium ${up ? "text-up" : "text-down"}`}
            >
              {up ? "+" : ""}
              {quote.data.changePct.toFixed(2)}% hoy
            </span>
          </div>
        )}
      </div>

      <div className="mb-3 flex gap-1">
        {(Object.keys(RANGES) as RangeKey[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              r === range
                ? "bg-accent text-accent-contrast"
                : "text-muted hover:text-content"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {history.isLoading ? (
        <p className="text-sm text-muted">Cargando gráfico…</p>
      ) : history.isError ? (
        <p className="text-sm text-down">No se pudo cargar el historial.</p>
      ) : points.length === 0 ? (
        <p className="text-sm text-muted">Sin datos de historial todavía.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={points}
            margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
          >
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
      )}
    </div>
  );
}
