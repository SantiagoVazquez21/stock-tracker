import { Suspense, lazy, useEffect, useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { Sidebar } from "./components/Sidebar";
import { AddWatchForm } from "./components/AddWatchForm";
import { SummaryStrip } from "./components/SummaryStrip";
import { WatchList } from "./components/WatchList";
import { MarketStatus, UpdatedAgo } from "./components/MarketStatus";

// Lazy: el detalle (que arrastra Recharts) y la paleta (cmdk) se cargan recién
// cuando se usan — no en la carga inicial. Bajan el peso del bundle de entrada.
const TickerDetail = lazy(() =>
  import("./components/TickerDetail").then((m) => ({
    default: m.TickerDetail,
  })),
);
const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);

const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toLowerCase().includes("mac");

export function App() {
  // Qué símbolo está seleccionado para ver su detalle (null = ninguno).
  const [selected, setSelected] = useState<string | null>(null);
  // Si el command palette (⌘K / Ctrl+K) está abierto.
  const [cmdOpen, setCmdOpen] = useState(false);

  // Atajo global: ⌘K (mac) o Ctrl+K (win/linux) abre/cierra la paleta.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AuthGate>
      {/* Shell de la app: rail lateral (o barra superior en mobile) + contenido. */}
      <div className="md:flex">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Watchlist
                </h2>
                <p className="text-sm text-muted">
                  Seguí el mercado desde el día que lo empezás a trackear.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <UpdatedAgo />
                <MarketStatus />
                <button
                  onClick={() => setCmdOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted transition hover:text-content"
                >
                  Buscar
                  <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium">
                    {isMac ? "⌘K" : "Ctrl K"}
                  </kbd>
                </button>
              </div>
            </header>

            <AddWatchForm />
            <SummaryStrip />
            <WatchList selected={selected} onSelect={setSelected} />
            {selected && (
              <Suspense
                fallback={
                  <div className="skeleton mt-6 h-72 rounded-xl border border-line" />
                }
              >
                <TickerDetail symbol={selected} />
              </Suspense>
            )}
          </div>
        </main>
      </div>

      {/* Solo se monta (y baja su chunk) al abrir la paleta. */}
      {cmdOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open
            onOpenChange={setCmdOpen}
            onSelect={setSelected}
          />
        </Suspense>
      )}
    </AuthGate>
  );
}
