// Marca de la app: un ícono de tendencia (línea que sube + punto final) en ámbar
// más el wordmark "Ticker". Reemplaza al emoji 📈, que es el tell #1 de "hecho
// por IA". El SVG usa h-[1em]/w-[1em]: escala solo, atado al font-size del padre
// (así el mismo componente sirve en el header grande y donde sea).
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-bold tracking-tight ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 28 28"
        aria-hidden
        className="h-[1em] w-[1em] shrink-0 text-accent"
      >
        <path
          d="M3 20 L10 12 L15 16 L25 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="5" r="2.6" fill="currentColor" />
      </svg>
      Ticker
    </span>
  );
}
