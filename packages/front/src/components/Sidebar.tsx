import { useQuery } from "@tanstack/react-query";
import { me } from "../api";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";

// Barra lateral de navegación. En desktop (md+) es un rail vertical fijo a la
// izquierda; en mobile colapsa a una barra superior (logo + logout). El email lo
// leo de la query ["me"], que ya está cacheada por el AuthGate: no re-pide nada.
export function Sidebar() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: me });

  return (
    <aside className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 md:sticky md:top-0 md:h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:py-6">
      <h1 className="text-xl">
        <Logo />
      </h1>

      {/* Navegación: solo visible en desktop. Hoy la app es una sola vista. */}
      <nav className="hidden md:mt-8 md:flex md:flex-col md:gap-1">
        <span className="rounded-lg bg-surface px-3 py-2 text-sm font-medium text-content">
          Watchlist
        </span>
        <span className="rounded-lg px-3 py-2 text-sm text-muted">
          Mercados <span className="text-xs">· pronto</span>
        </span>
      </nav>

      {/* Al fondo en desktop: usuario + logout. En mobile solo el logout. */}
      <div className="flex items-center gap-3 md:mt-auto md:flex-col md:items-stretch md:gap-2">
        {user && (
          <p className="hidden truncate text-xs text-muted md:block">
            {user.email}
          </p>
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}
