import type { WatchSummary, HistoryPoint, AuthUser } from "@stock-tracker/shared";

// La URL del back. Configurable por entorno (Vite expone las vars VITE_*),
// con localhost:3000 como default en desarrollo.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// Helper genérico: hace el fetch, chequea el status y devuelve el JSON tipado.
// El <T> es el tipo esperado de la respuesta — cada función de abajo lo fija.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    // include = manda y recibe la cookie de sesión (httpOnly) en cada pedido,
    // aunque el front y el back estén en orígenes distintos.
    credentials: "include",
    // Solo declaramos JSON cuando hay body: un POST sin body (ej. logout) con
    // Content-Type json haría que el back intente parsear un cuerpo vacío → 400.
    headers: options?.body ? { "Content-Type": "application/json" } : {},
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// GET /watches → la watchlist con el % desde que empecé.
export function getWatches() {
  return request<WatchSummary[]>("/watches");
}

// POST /watches → agrega un símbolo (backfill incluido en el back).
export function addWatch(symbol: string) {
  return request<{ savedPricePoints: number }>("/watches", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

// GET /watches/:symbol/history → puntos para el gráfico.
export function getHistory(symbol: string) {
  return request<HistoryPoint[]>(
    `/watches/${encodeURIComponent(symbol)}/history`,
  );
}

// ── Auth ────────────────────────────────────────────────────────────────────
export function register(email: string, password: string) {
  return request<AuthUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<AuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

// Quién soy (o error 401 si no hay sesión).
export function me() {
  return request<AuthUser>("/auth/me");
}
