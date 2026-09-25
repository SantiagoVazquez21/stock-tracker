import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import "./index.css";
import { App } from "./App";

// El QueryClient es el "cerebro" de TanStack Query: cachea las respuestas,
// maneja loading/error y re-fetchea cuando hace falta. Se crea una vez.
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* reducedMotion="user": si el sistema pide "menos movimiento", motion apaga
        automáticamente las animaciones de transform/layout (deja opacidad/color).
        Accesibilidad para todo el árbol de una. */}
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
);
