import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { login, register } from "../api";
import { Logo } from "./Logo";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      mode === "login" ? login(email, password) : register(email, password),
    onSuccess: () => {
      // Al loguearse/registrarse, revalidamos "me" → el AuthGate muestra el dashboard.
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const input =
    "rounded-lg border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent";

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-3xl">
        <Logo />
      </h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        {mode === "login"
          ? "Iniciá sesión para ver tu watchlist."
          : "Creá tu cuenta para empezar a trackear."}
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={input}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña (mín. 8 caracteres)"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={input}
        />
        <motion.button
          type="submit"
          disabled={mutation.isPending}
          whileTap={{ scale: 0.98 }}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover disabled:opacity-50"
        >
          {mutation.isPending
            ? "Un momento…"
            : mode === "login"
              ? "Iniciar sesión"
              : "Registrarme"}
        </motion.button>
      </form>

      {mutation.isError && (
        <p className="mt-3 text-xs text-down">
          No se pudo. Revisá el email y la contraseña.
        </p>
      )}

      <button
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          mutation.reset();
        }}
        className="mt-5 text-xs text-muted transition hover:text-content"
      >
        {mode === "login"
          ? "¿No tenés cuenta? Registrate"
          : "¿Ya tenés cuenta? Iniciá sesión"}
      </button>
    </div>
  );
}
