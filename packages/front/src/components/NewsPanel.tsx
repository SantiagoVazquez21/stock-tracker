import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type { AffectedTicker, NewsItem } from "@stock-tracker/shared";
import { getNews } from "../api";

// "hace 3 min", "hace 2 h", etc.
function hace(iso: string): string {
  const s = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

interface NewsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NewsPanel({ open, onClose }: NewsPanelProps) {
  // Solo pollea con el panel abierto. El back cachea 45 min, así que este poll
  // solo relee el caché y mantiene fresco el "hace…".
  const { data, isLoading, isError } = useQuery({
    queryKey: ["news"],
    queryFn: getNews,
    enabled: open,
    refetchInterval: open ? 5 * 60_000 : false,
    staleTime: 60_000,
  });
  const items = data ?? [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-label="Noticias de mercado"
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-up" />
                <h2 className="font-semibold">Noticias</h2>
                <span className="text-xs text-muted">
                  de mercado · analizadas
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar noticias"
                className="rounded-lg px-2 py-1 text-muted transition hover:text-content"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-3">
              {isLoading ? (
                <ul className="flex flex-col gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li key={i} className="skeleton h-24 rounded-xl" />
                  ))}
                </ul>
              ) : isError ? (
                <p className="p-4 text-sm text-down">
                  No se pudieron cargar las noticias.
                </p>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">
                  <p>No hay noticias relevantes por ahora.</p>
                  <p className="mt-1 text-xs">
                    Mostramos solo noticias de mercado con análisis de impacto.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {items.map((n, i) => (
                      <NewsCard key={n.id} item={n} index={i} />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.03 }}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-line bg-base p-3 transition hover:border-accent"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-content">{item.source}</span>
            <span aria-hidden>·</span>
            <span>{hace(item.datetime)}</span>
          </div>
          <RelevanceBadge value={item.relevance} />
        </div>

        <p className="text-sm font-medium leading-snug">{item.headline}</p>

        {item.affected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.affected.map((a) => (
              <TickerChip key={a.symbol} affected={a} />
            ))}
          </div>
        )}
      </a>
    </motion.li>
  );
}

// Badge de relevancia 1-100. Más alto = más lleno/acentuado.
function RelevanceBadge({ value }: { value: number }) {
  const strong = value >= 70;
  return (
    <span
      title="Relevancia de la noticia (1-100)"
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
        strong ? "bg-accent/20 text-accent" : "bg-surface-2 text-muted"
      }`}
    >
      Rel. {value}
    </span>
  );
}

// Chip de acción afectada: flecha + color por sentiment. Si la seguís, borde acento.
function TickerChip({ affected }: { affected: AffectedTicker }) {
  const pos = affected.sentiment > 0.05;
  const neg = affected.sentiment < -0.05;
  const tone = pos ? "text-up" : neg ? "text-down" : "text-muted";
  const arrow = pos ? "▲" : neg ? "▼" : "→";
  return (
    <span
      title={`${affected.name} · sentiment ${affected.sentiment.toFixed(2)}${
        affected.inWatchlist ? " · en tu watchlist" : ""
      }`}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone} ${
        affected.inWatchlist
          ? "border border-accent bg-accent/10"
          : "bg-surface-2"
      }`}
    >
      {affected.symbol} <span aria-hidden>{arrow}</span>
    </span>
  );
}
