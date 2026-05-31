/**
 * Formatea segundos a formato mm:ss para visualización en relojes/temporizadores.
 * @example formatTime(125) => "2:05"
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
