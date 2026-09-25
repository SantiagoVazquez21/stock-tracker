import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWatch, getWatches, searchSymbols } from "../api";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (symbol: string) => void;
}

// Paleta de comandos estilo ⌘K: buscar y saltar a un ticker de la watchlist, o
// buscar en el mercado y agregarlo. Es un patrón muy "producto real" en finanzas.
export function CommandPalette({
  open,
  onOpenChange,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const watches = useQuery({ queryKey: ["watches"], queryFn: getWatches });
  const search = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchSymbols(debounced),
    enabled: debounced.length >= 1,
    staleTime: 60_000,
  });
  const add = useMutation({
    mutationFn: (symbol: string) => addWatch(symbol),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watches"] }),
  });

  const owned = watches.data ?? [];
  const results = search.data ?? [];
  const q = debounced.toLowerCase();

  // Filtro propio (shouldFilter={false}): la watchlist se filtra en cliente y los
  // resultados de mercado ya vienen filtrados del back.
  const ownedFiltered = owned.filter(
    (w) =>
      !q ||
      w.symbol.toLowerCase().includes(q) ||
      w.name.toLowerCase().includes(q),
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Buscador"
      shouldFilter={false}
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Buscar acción o ir a un ticker…"
      />
      <Command.List>
        <Command.Empty>Sin resultados.</Command.Empty>

        {ownedFiltered.length > 0 && (
          <Command.Group heading="Tu watchlist">
            {ownedFiltered.map((w) => (
              <Command.Item
                key={`own-${w.symbol}`}
                value={`own-${w.symbol}`}
                onSelect={() => {
                  onSelect(w.symbol);
                  onOpenChange(false);
                }}
              >
                <span className="font-semibold">{w.symbol}</span>
                <span className="truncate text-muted">{w.name}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {debounced.length >= 1 && results.length > 0 && (
          <Command.Group heading="Agregar del mercado">
            {results.map((r) => (
              <Command.Item
                key={`add-${r.symbol}-${r.exchange}`}
                value={`add-${r.symbol}-${r.exchange}`}
                onSelect={() => {
                  add.mutate(r.symbol);
                  setQuery("");
                  onOpenChange(false);
                }}
              >
                <span className="font-semibold">{r.symbol}</span>
                <span className="truncate text-muted">{r.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">
                  {r.exchange}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
