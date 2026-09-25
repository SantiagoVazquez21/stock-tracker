import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHistory, getQuote } from "../api";

// Cada rango = cuántos días (de trading) del final mostramos.
const RANGES = { "1S": 5, "1M": 22, "3M": 66, "6M": 132, "1A": 252 } as const;
type RangeKey = keyof typeof RANGES;

// Colores de suba/baja para el SVG del gráfico. Reflejan los tokens
// --color-up / --color-down de index.css (los gradientes SVG no leen bien las
// CSS vars en todos los navegadores, así que acá van en hex).
const UP = "#22c55e";
const DOWN = "#ef4444";

// Eje Y compacto: $31.5k en vez de $31500 (más legible con acciones caras).
function fmtAxis(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;
}

// Tooltip propio (HTML, no el default de Recharts) para que combine con el diseño.
// Tipo mínimo local: evita depender de los tipos internos de Recharts y de `any`.
interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value?: number }>;
}
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (value == null) return null;
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-[0_8px_20px_-6px_rgb(0_0_0/0.5)]">
      <p className="text-muted">{label}</p>
      <p className="font-semibold tabular-nums text-content">
        ${value.toFixed(2)}
      </p>
    </div>
  );
}

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

  // overflow-hidden + min-w-0: evita que el ResponsiveContainer de Recharts
  // "estire" la página en pantallas angostas (mide contra una caja acotada).
  const box =
    "mt-6 min-w-0 overflow-hidden rounded-xl border border-line bg-surface p-4";
  const dayUp = (quote.data?.changePct ?? 0) >= 0;

  // Recortamos el historial ya cargado a los últimos N puntos del rango elegido.
  const points = history.data?.slice(-RANGES[range]) ?? [];

  // La línea/área se pinta según cómo le fue EN EL RANGO VISIBLE (primer vs último
  // cierre): verde si terminó arriba, rojo si terminó abajo. Es lo intuitivo.
  const firstClose = points[0]?.close;
  const lastClose = points[points.length - 1]?.close;
  const chartUp =
    firstClose != null && lastClose != null ? lastClose >= firstClose : true;
  const lineColor = chartUp ? UP : DOWN;
  const gradId = `grad-${symbol}-${chartUp ? "up" : "down"}`;

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
              className={`text-xs font-medium ${dayUp ? "text-up" : "text-down"}`}
            >
              {dayUp ? "+" : ""}
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
        // key={range}: al cambiar de rango, el gráfico se remonta → vuelve a
        // "dibujarse" (draw-in) y hace un fade suave (.chart-fade en index.css).
        <div key={range} className="chart-fade">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={points}
              margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                {/* Degradé vertical: del color de la línea (arriba) a transparente. */}
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-line)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="var(--color-muted)"
                fontSize={11}
                tickMargin={8}
                minTickGap={40}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--color-muted)"
                fontSize={11}
                width={52}
                domain={["auto", "auto"]}
                tickFormatter={fmtAxis}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: lineColor,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: lineColor,
                  stroke: "var(--color-base)",
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
