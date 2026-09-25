import { describe, it, expect } from "vitest";
import { usMarketStatus } from "./marketHours";

// Uso fechas en UTC que corresponden a horas conocidas de Nueva York. En
// septiembre 2026 NY está en EDT (UTC-4), así que 18:00Z = 14:00 en NY.
describe("usMarketStatus (estado del mercado US)", () => {
  it("está Abierto un día hábil en horario de rueda", () => {
    // Viernes 2026-09-25, 14:00 EDT
    const s = usMarketStatus(new Date("2026-09-25T18:00:00Z"));
    expect(s.label).toBe("Abierto");
    expect(s.tone).toBe("open");
  });

  it("está Cerrado el fin de semana", () => {
    // Sábado 2026-09-26, 14:00 EDT
    const s = usMarketStatus(new Date("2026-09-26T18:00:00Z"));
    expect(s.label).toBe("Cerrado");
    expect(s.tone).toBe("closed");
  });

  it("marca Pre-market antes de la apertura", () => {
    // Viernes 08:00 EDT
    expect(usMarketStatus(new Date("2026-09-25T12:00:00Z")).label).toBe(
      "Pre-market",
    );
  });

  it("marca After-hours después del cierre", () => {
    // Viernes 17:00 EDT
    expect(usMarketStatus(new Date("2026-09-25T21:00:00Z")).label).toBe(
      "After-hours",
    );
  });

  it("está Cerrado de madrugada (antes del pre-market)", () => {
    // Viernes 02:00 EDT
    expect(usMarketStatus(new Date("2026-09-25T06:00:00Z")).label).toBe(
      "Cerrado",
    );
  });
});
