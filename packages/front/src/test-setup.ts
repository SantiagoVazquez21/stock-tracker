// Setup de los tests del front (se carga antes de cada archivo de test).
// Suma los matchers de jest-dom (toBeInTheDocument, etc.) a expect de Vitest.
import "@testing-library/jest-dom/vitest";

// jsdom no trae matchMedia; motion lo consulta para prefers-reduced-motion.
// Sin este stub, cualquier componente con `motion.*` reventaría en los tests.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
