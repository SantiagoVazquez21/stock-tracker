// Lógica pura (sin React) del estado del mercado US. Separada del componente para
// poder testearla sola y para no mezclar exports no-componentes en un .tsx.

export type MarketStatus = { label: string; tone: "open" | "closed" | "ext" };

// Estado del mercado US (NYSE/Nasdaq) según la hora de Nueva York. El truco de
// toLocaleString con timeZone deja que Intl maneje el horario de verano (DST).
// No contempla feriados (simplificación honesta) — por eso el label aclara "US".
export function usMarketStatus(now: Date): MarketStatus {
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
