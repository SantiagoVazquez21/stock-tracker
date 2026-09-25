import NumberFlow from "@number-flow/react";

// Wrappers de NumberFlow: los números "ruedan" al cambiar (precio en vivo, %,
// contadores). NumberFlow respeta prefers-reduced-motion solo. Fijo locale
// "en-US" para mantener el formato actual de la app ($ y punto decimal), no el
// es-AR (US$ y coma), y así no cambiar el look que ya viste.

// Plata: "$229.35". prefix en vez de style:"currency" para que quede el "$" pelado.
export function Money({ value }: { value: number }) {
  return (
    <NumberFlow
      value={value}
      prefix="$"
      locales="en-US"
      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
    />
  );
}

// Porcentaje: "12.40%". sign=true muestra el "+" adelante (ej. "+1.14%").
export function Pct({
  value,
  sign = false,
}: {
  value: number;
  sign?: boolean;
}) {
  return (
    <NumberFlow
      value={value}
      suffix="%"
      locales="en-US"
      format={{
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: sign ? "always" : "auto",
      }}
    />
  );
}

// Entero (contadores de la tira de stats).
export function Int({ value }: { value: number }) {
  return <NumberFlow value={value} locales="en-US" />;
}
