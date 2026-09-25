import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { me } from "../api";
import { AuthForm } from "./AuthForm";

// Portero: pregunta "¿quién soy?" al back. Si hay sesión → muestra la app;
// si no (401) → muestra el formulario de login/registro.
export function AuthGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: me,
    retry: false, // un 401 no se reintenta: significa "no logueado", no un fallo
  });

  if (isLoading) {
    return <p className="pt-10 text-sm text-muted">Cargando…</p>;
  }
  if (isError || !data) {
    return <AuthForm />;
  }
  return <>{children}</>;
}
