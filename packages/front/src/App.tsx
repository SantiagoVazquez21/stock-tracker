import { useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { LogoutButton } from "./components/LogoutButton";
import { AddWatchForm } from "./components/AddWatchForm";
import { WatchList } from "./components/WatchList";
import { PriceChart } from "./components/PriceChart";

export function App() {
  // Qué símbolo está seleccionado para ver su gráfico (null = ninguno).
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Todo lo de adentro solo se ve con sesión iniciada. */}
        <AuthGate>
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ticker</h1>
              <p className="mt-1 text-sm text-muted">
                Seguí el mercado desde el día que lo empezás a trackear.
              </p>
            </div>
            <LogoutButton />
          </header>

          <AddWatchForm />
          <WatchList selected={selected} onSelect={setSelected} />
          {selected && <PriceChart symbol={selected} />}
        </AuthGate>
      </div>
    </div>
  );
}
