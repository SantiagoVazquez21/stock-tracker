import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type { NewsItem } from "@stock-tracker/shared";
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
  // Solo pollea con el panel abierto (enabled + refetchInterval atados a `open`),
  // así no gastamos pedidos cuando está cerrado.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["news"],
    queryFn: getNews,
    enabled: open,
    refetchInterval: open ? 60_000 : false,
    staleTime: 30_000,
  });
  const items = data ?? [];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Fondo oscuro: click afuera = cerrar. */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />

          {/* Panel lateral que entra deslizándose desde la derecha. */}
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
                <span className="text-xs text-muted">de mercado · en vivo</span>
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
                    <li key={i} className="skeleton h-20 rounded-xl" />
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
                    Mostramos solo titulares de fuentes serias o que tocan tu
                    watchlist.
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
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="font-medium text-content">{item.source}</span>
          <span aria-hidden>·</span>
          <span>{hace(item.datetime)}</span>
        </div>
        <p className="text-sm font-medium leading-snug">{item.headline}</p>
        {item.related.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.related.map((t) => (
              <span
                key={t}
                className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </a>
    </motion.li>
  );
}
