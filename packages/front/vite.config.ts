import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
  build: {
    rollupOptions: {
      output: {
        // Separamos las librerías grandes en chunks propios. Recharts y cmdk,
        // además, solo se importan de forma diferida (lazy) → sus chunks se
        // bajan recién cuando hacen falta (al abrir un gráfico o el ⌘K).
        manualChunks: {
          query: ["@tanstack/react-query"],
          motion: ["motion"],
          recharts: ["recharts"],
          cmdk: ["cmdk"],
        },
      },
    },
  },
});
