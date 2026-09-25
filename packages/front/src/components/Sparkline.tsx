import { useState } from "react";

// Sparkline: un mini-gráfico de línea sin ejes ni tooltip, para meter DENTRO de
// una fila de la tabla. Es el detalle que hace que una watchlist se vea como
// TradingView y no como una lista de tareas. Lo dibujo a mano con un <polyline>
// SVG: cero dependencias y súper liviano.
export function Sparkline({
  data,
  up,
  width = 96,
  height = 28,
}: {
  data: number[];
  up: boolean;
  width?: number;
  height?: number;
}) {
  // Con menos de 2 puntos no hay línea que dibujar; devuelvo un hueco del mismo
  // tamaño para que la tabla no salte.
  if (!data || data.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const pad = 2; // margen vertical para que la línea no se corte arriba/abajo
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // evita dividir por 0 si todos los cierres son iguales
  const stepX = width / (data.length - 1);

  // Cada cierre → un punto "x,y". La Y se invierte (en SVG el 0 está arriba).
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = up ? "var(--color-up)" : "var(--color-down)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Monograma: un tile con las iniciales del ticker y un color estable derivado del
// símbolo (mismo símbolo → mismo color siempre). Reemplaza al ticker "pelado" en
// texto y, en la Fase 4, va a ser el fallback cuando un logo real no exista.
export function Monogram({ symbol }: { symbol: string }) {
  // Saco el sufijo de mercado (.BA) y me quedo con 2 letras.
  const letters = symbol.replace(/\.[A-Z]+$/, "").slice(0, 2);
  // Hash simple del símbolo → un tono (0-359) reproducible.
  const hue = [...symbol].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
      style={{
        backgroundColor: `hsl(${hue} 40% 22%)`,
        color: `hsl(${hue} 75% 78%)`,
      }}
    >
      {letters}
    </span>
  );
}

// Logo real de la empresa vía logo.dev (token público, va en la URL de la imagen).
// Si no hay token configurado o el logo no existe (404, ej. tickers .BA del Merval),
// cae al Monograma. El token se pone en VITE_LOGODEV_TOKEN (env del front).
export function TickerLogo({ symbol }: { symbol: string }) {
  const token = import.meta.env.VITE_LOGODEV_TOKEN as string | undefined;
  const [failed, setFailed] = useState(false);

  // logo.dev busca por ticker sin sufijo de mercado (AAPL, no GGAL.BA).
  const ticker = symbol.replace(/\.[A-Z]+$/, "");

  if (!token || failed) return <Monogram symbol={symbol} />;

  return (
    <img
      src={`https://img.logo.dev/ticker/${encodeURIComponent(ticker)}?token=${token}&size=64&format=png`}
      alt=""
      aria-hidden
      loading="lazy"
      width={32}
      height={32}
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded-md bg-surface-2 object-contain"
    />
  );
}
