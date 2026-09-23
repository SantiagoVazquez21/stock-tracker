import { useState } from "react";
import { AddWatchForm } from "./components/AddWatchForm";
import { WatchList } from "./components/WatchList";
import { PriceChart } from "./components/PriceChart";

export function App() {
  // Qué símbolo está seleccionado para ver su gráfico (null = ninguno).
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Ticker</h1>
          <p className="mt-1 text-sm text-muted">
            Seguí el mercado desde el día que lo empezás a trackear.
          </p>
        </header>

        <AddWatchForm />
        <WatchList selected={selected} onSelect={setSelected} />
        {selected && <PriceChart symbol={selected} />}
      </div>
    </div>
  );
}
