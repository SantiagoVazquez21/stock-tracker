import bcrypt from "bcryptjs";
import { prisma } from "./db";

// Cost factor de bcrypt: cuántas rondas de hashing. Más alto = más seguro pero
// más lento. 10 es el estándar recomendado.
const SALT_ROUNDS = 10;

// Convierte una contraseña en un hash irreversible (con salt incluido).
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Compara una contraseña en texto con un hash guardado. bcrypt re-aplica el
// mismo salt y compara; nunca "des-hashea" nada.
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Crea un usuario con la contraseña YA hasheada. select sin passwordHash: nunca
// dejamos salir el hash de esta capa.
export async function createUser(email: string, password: string) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true },
  });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
