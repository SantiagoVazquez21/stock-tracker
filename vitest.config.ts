import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dos proyectos de test que conviven:
//  - back: entorno node (como venía).
//  - front: entorno jsdom + plugin de React, para testear componentes.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "back",
          environment: "node",
          include: ["packages/back/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "front",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./packages/front/src/test-setup.ts"],
          include: ["packages/front/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});
