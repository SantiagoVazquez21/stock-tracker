import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addWatch } from "../api";

export function AddWatchForm() {
  const [symbol, setSymbol] = useState("");
  const queryClient = useQueryClient();

  // useMutation maneja una escritura (POST). Nos da isPending/isError sin que
  // tengamos que manejar estados a mano.
  const mutation = useMutation({
    mutationFn: (s: string) => addWatch(s),
    onSuccess: () => {
      // Al agregar, invalidamos la watchlist para que se vuelva a pedir sola.
      queryClient.invalidateQueries({ queryKey: ["watches"] });
      setSymbol("");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = symbol.trim();
    if (s) mutation.mutate(s);
  }

  return (
    <form onSubmit={onSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Buscar símbolo (ej. AAPL)"
          className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Agregando…" : "Agregar"}
        </button>
      </div>
      {mutation.isError && (
        <p className="mt-2 text-xs text-down">
          No se pudo agregar. Revisá el símbolo o que el back esté corriendo.
        </p>
      )}
    </form>
  );
}
