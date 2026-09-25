import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline, Monogram, TickerLogo } from "./Sparkline";

describe("Monogram", () => {
  it("usa las primeras 2 letras del ticker", () => {
    const { container } = render(<Monogram symbol="AAPL" />);
    expect(container.textContent).toBe("AA");
  });

  it("saca el sufijo de mercado .BA", () => {
    const { container } = render(<Monogram symbol="GGAL.BA" />);
    expect(container.textContent).toBe("GG");
  });
});

describe("Sparkline", () => {
  it("dibuja una polyline con un punto por dato", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} up />);
    const poly = container.querySelector("polyline");
    expect(poly).not.toBeNull();
    const points = poly?.getAttribute("points")?.trim().split(/\s+/) ?? [];
    expect(points).toHaveLength(4);
  });

  it("no dibuja línea con menos de 2 puntos", () => {
    const { container } = render(<Sparkline data={[5]} up />);
    expect(container.querySelector("polyline")).toBeNull();
  });
});

describe("TickerLogo", () => {
  it("cae al monograma cuando no hay token de logo.dev", () => {
    // En los tests no hay VITE_LOGODEV_TOKEN → debe mostrar iniciales, no <img>.
    const { container } = render(<TickerLogo symbol="AAPL" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("AA");
  });
});
