import Fastify from "fastify";

// Arma el servidor y devuelve la app SIN levantarla (sin .listen()). Separar el
// "armar" del "escuchar" permite testear las rutas con app.inject() —pedidos
// simulados en memoria, sin abrir un puerto real— en la próxima etapa.
export function buildServer(options: { logger?: boolean } = {}) {
  // Logger prendido por defecto (producción/dev), pero se puede apagar en los
  // tests para que no ensucien la salida ni se pongan lentos.
  const app = Fastify({ logger: options.logger ?? true });

  // Healthcheck: sirve para confirmar que el server está vivo (lo usan los
  // servicios de deploy para saber si la app arrancó bien).
  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}
