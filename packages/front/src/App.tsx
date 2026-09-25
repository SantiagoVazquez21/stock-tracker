import { useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { Sidebar } from "./components/Sidebar";
import { AddWatchForm } from "./components/AddWatchForm";
import { SummaryStrip } from "./components/SummaryStrip";
import { WatchList } from "./components/WatchList";
import { TickerDetail } from "./components/TickerDetail";

export function App() {
  // Qué símbolo está seleccionado para ver su detalle (null = ninguno).
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AuthGate>
      {/* Shell de la app: rail lateral (o barra superior en mobile) + contenido. */}
      <div className="md:flex">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
            <header className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight">
                Watchlist
              </h2>
              <p className="text-sm text-muted">
                Seguí el mercado desde el día que lo empezás a trackear.
              </p>
            </header>

            <AddWatchForm />
            <SummaryStrip />
            <WatchList selected={selected} onSelect={setSelected} />
            {selected && <TickerDetail symbol={selected} />}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
