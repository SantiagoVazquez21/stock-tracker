import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWatch, searchSymbols } from "../api";

export function AddWatchForm() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const queryClient = useQueryClient();

  // Debounce: espera 300 ms sin tipear antes de buscar, para no pegarle a la API
  // en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const search = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchSymbols(debounced),
    enabled: debounced.length >= 1,
    staleTime: 60_000,
  });

  const add = useMutation({
    mutationFn: (symbol: string) => addWatch(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watches"] });
      setQuery("");
      setDebounced("");
    },
  });

  const results = search.data ?? [];
  const showDropdown =
    debounced.length >= 1 && results.length > 0 && !add.isPending;

  return (
    <div className="relative mb-6">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por símbolo o empresa (ej. YPF, Apple)…"
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
      />

      {add.isPending && (
        <p className="mt-2 text-xs text-muted">Agregando {add.variables}…</p>
      )}
      {add.isError && (
        <p className="mt-2 text-xs text-down">
          No se pudo agregar. Probá con otro símbolo.
        </p>
      )}

      {showDropdown && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-surface shadow-[0_12px_28px_-8px_rgb(0_0_0/0.55)]">
          {results.map((r) => (
            <li key={`${r.symbol}-${r.exchange}`}>
              <button
                onClick={() => add.mutate(r.symbol)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="font-semibold">{r.symbol}</span>{" "}
                  <span className="text-muted">{r.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {r.exchange}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
