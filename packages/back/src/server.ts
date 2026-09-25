import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { z } from "zod";
import type { MarketDataSource } from "@stock-tracker/shared";
import { addWatch, getStoredHistory, getWatchlistSummary } from "./watchlist";
import { createUser, findUserByEmail, findUserById, verifyPassword } from "./auth";

// Tipos del JWT: qué guardamos en el token (payload) y qué queda en request.user.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: number };
    user: { id: number };
  }
}

// El decorator que protege rutas (verifica que haya un token válido).
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Un símbolo válido: solo letras, números y puntos (tickers "AAPL"/"GGAL.BA"),
// máx 12. Bloquea inyección de parámetros en la URL de la API externa.
const symbolSchema = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z0-9.]{1,12}$/,
    "Símbolo inválido: solo letras, números y puntos (máx. 12).",
  )
  .toUpperCase();

const AddWatchBody = z.object({ symbol: symbolSchema });

// Credenciales de registro/login. Password mínimo 8.
const CredentialsBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function buildServer(options: {
  source: MarketDataSource;
  jwtSecret: string;
  logger?: boolean;
  rateLimitMax?: number;
  allowedOrigins?: string[];
}) {
  const { source } = options;
  const app = Fastify({ logger: options.logger ?? true });

  // Headers de seguridad HTTP.
  await app.register(helmet);
  // Rate limit global (por IP).
  await app.register(rateLimit, {
    max: options.rateLimitMax ?? 60,
    timeWindow: "1 minute",
  });
  // CORS: solo el front autorizado. credentials:true para que viaje la cookie.
  await app.register(cors, {
    origin: options.allowedOrigins ?? ["http://localhost:5174"],
    credentials: true,
  });
  // Cookies + JWT: el token de sesión viaja en una cookie httpOnly.
  await app.register(cookie);
  await app.register(jwt, {
    secret: options.jwtSecret,
    cookie: { cookieName: "token", signed: false },
  });

  // Decorator para proteger rutas: verifica el JWT de la cookie. Si falla → 401.
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "No autenticado" });
      }
    },
  );

  const isProd = process.env.NODE_ENV === "production";

  function setAuthCookie(reply: FastifyReply, token: string) {
    reply.setCookie("token", token, {
      httpOnly: true, // no accesible desde JS → protege contra robo por XSS
      // Front y back en dominios distintos (Vercel↔Render) = cross-site: exige
      // "none" + secure. En local (mismo localhost) "lax" alcanza y no pide HTTPS.
      sameSite: isProd ? "none" : "lax",
      secure: isProd, // "none" solo es válido con secure (HTTPS)
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
  }

  app.get("/health", async () => ({ status: "ok" }));

  // ── Auth ────────────────────────────────────────────────────────────────
  // Rate limit MÁS estricto acá (5/min) contra fuerza bruta.
  app.post(
    "/auth/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = CredentialsBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "Datos inválidos", details: parsed.error.issues });
      }
      const { email, password } = parsed.data;
      if (await findUserByEmail(email)) {
        return reply.code(409).send({ error: "Ese email ya está registrado" });
      }
      const user = await createUser(email, password);
      setAuthCookie(reply, app.jwt.sign({ id: user.id }));
      return reply.code(201).send({ id: user.id, email: user.email });
    },
  );

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = CredentialsBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Datos inválidos" });
      }
      const { email, password } = parsed.data;
      const user = await findUserByEmail(email);
      // Mensaje genérico: no revelamos si el email existe (anti enumeración).
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return reply.code(401).send({ error: "Email o contraseña incorrectos" });
      }
      setAuthCookie(reply, app.jwt.sign({ id: user.id }));
      return { id: user.id, email: user.email };
    },
  );

  app.post("/auth/logout", async (_request, reply) => {
    // Mismos atributos que al setearla, para que el navegador la borre bien.
    reply.clearCookie("token", {
      path: "/",
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
    });
    return { ok: true };
  });

  // Quién soy: el front lo usa para saber si hay sesión (la cookie es httpOnly,
  // así que no puede leerla desde JS). 200 con el usuario, o 401 vía el decorator.
  app.get("/auth/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await findUserById(request.user.id);
    if (!user) {
      return reply.code(401).send({ error: "No autenticado" });
    }
    return user;
  });

  // ── Watchlist (protegida: cada usuario ve solo la suya) ───────────────────
  app.get("/watches", { preHandler: [app.authenticate] }, async (request) => {
    return getWatchlistSummary(request.user.id);
  });

  app.post(
    "/watches",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = AddWatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "Body inválido", details: parsed.error.issues });
      }
      try {
        const result = await addWatch(source, request.user.id, parsed.data.symbol);
        return reply.code(201).send(result);
      } catch (err) {
        request.log.error(err);
        return reply.code(502).send({ error: `No se pudo agregar ${parsed.data.symbol}` });
      }
    },
  );

  app.get<{ Params: { symbol: string } }>(
    "/watches/:symbol/history",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = symbolSchema.safeParse(request.params.symbol);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Símbolo inválido" });
      }
      return getStoredHistory(parsed.data);
    },
  );

  return app;
}
