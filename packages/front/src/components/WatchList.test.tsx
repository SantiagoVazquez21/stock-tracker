import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WatchSummary } from "@stock-tracker/shared";

// NumberFlow → número pelado (ver SummaryStrip.test).
vi.mock("@number-flow/react", () => ({
  default: ({ value }: { value: number }) => value,
}));

// Mock del cliente de API: no queremos red en los tests.
const removeWatchSpy = vi.fn().mockResolvedValue(undefined);
vi.mock("../api", () => ({
  getWatches: vi.fn().mockResolvedValue([]),
  removeWatch: (symbol: string) => removeWatchSpy(symbol),
}));

import { WatchList } from "./WatchList";

function watch(
  symbol: string,
  name: string,
  pct: number,
  last: number,
): WatchSummary {
  return {
    symbol,
    name,
    startedAt: "2026-01-01T00:00:00.000Z",
    startClose: last,
    lastClose: last,
    lastDate: "2026-01-02",
    pctSinceStart: pct,
    spark: [1, 2, 3],
  };
}

function renderWith(data: WatchSummary[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["watches"], data);
  return render(
    <QueryClientProvider client={client}>
      <WatchList selected={null} onSelect={() => {}} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  removeWatchSpy.mockClear();
});

describe("WatchList", () => {
  it("muestra el estado vacío cuando no hay nada seguido", () => {
    renderWith([]);
    expect(screen.getByText(/watchlist está vacía/i)).toBeInTheDocument();
  });

  it("renderiza una fila con símbolo, nombre y precio", () => {
    renderWith([watch("AAPL", "Apple Inc.", 12.4, 229.35)]);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    // Precio vía Money → NumberFlow mockeado renderiza el valor pelado.
    expect(screen.getByText("229.35")).toBeInTheDocument();
  });

  it("llama a removeWatch al tocar el botón ✕", async () => {
    renderWith([watch("AAPL", "Apple Inc.", 1, 10)]);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Dejar de seguir AAPL/i }),
    );
    expect(removeWatchSpy).toHaveBeenCalledWith("AAPL");
  });
});
