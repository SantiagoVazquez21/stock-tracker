import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api";

export function LogoutButton() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Invalida "me" → el AuthGate vuelve a preguntar, da 401, muestra el login.
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      className="text-xs text-muted transition hover:text-content"
    >
      Cerrar sesión
    </button>
  );
}
