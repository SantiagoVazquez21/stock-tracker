// Variación porcentual de `from` a `to`. Ej: de 100 a 112 = +12 (%).
// Si `from` es 0 no se puede calcular (división por cero), así que devolvemos 0
// en vez de un Infinity/NaN que arrastraría un bug silencioso más adelante.
export function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}
