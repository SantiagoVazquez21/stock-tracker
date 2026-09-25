import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Lo que NO se lintea.
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.config.{js,ts}",
      "packages/back/prisma/migrations/**",
    ],
  },
  // Reglas base de JS y de TypeScript.
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Reglas específicas de React (solo en el front).
  {
    files: ["packages/front/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "warn",
    },
  },
  // Va ÚLTIMO: desactiva las reglas de estilo que chocarían con Prettier.
  prettier,
);
