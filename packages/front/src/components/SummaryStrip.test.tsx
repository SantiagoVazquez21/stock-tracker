import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WatchSummary } from "@stock-tracker/shared";

// NumberFlow (web component) no rinde bien en jsdom: lo reemplazo por el número
// pelado para poder afirmar sobre el texto.
vi.mock("@number-flow/react", () => ({
  default: ({ value }: { value: number }) => value,
}));

import { SummaryStrip } from "./SummaryStrip";

function watch(symbol: string, pct: number | null): WatchSummary {
  return {
    symbol,
    name: symbol,
    startedAt: "2026-01-01T00:00:00.000Z",
    startClose: 100,
    lastClose: 100,
    lastDate: "2026-01-02",
    pctSinceStart: pct,
    spark: [],
  };
}

function renderWith(data: WatchSummary[]) {
  // staleTime Infinity: usa la data sembrada y no dispara fetch de fondo.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["watches"], data);
  return render(
    <QueryClientProvider client={client}>
      <SummaryStrip />
    </QueryClientProvider>,
  );
}

describe("SummaryStrip", () => {
  it("no muestra nada con la watchlist vacía", () => {
    const { container } = renderWith([]);
    expect(container.firstChild).toBeNull();
  });

  it("muestra los tiles y marca el mejor performer", () => {
    renderWith([
      watch("AAPL", 12),
      watch("MSFT", 5),
      watch("TSLA", -3),
      watch("GGAL.BA", -1),
      watch("YPFD.BA", 25),
    ]);

    expect(screen.getByText("Siguiendo")).toBeInTheDocument();
    expect(screen.getByText("En alza")).toBeInTheDocument();
    expect(screen.getByText("En baja")).toBeInTheDocument();
    // El mejor desde inicio es YPFD.BA (+25%).
    expect(screen.getByText("YPFD.BA")).toBeInTheDocument();
  });
});
