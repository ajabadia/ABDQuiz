/**
 * @purpose Proporciona formatos de segundos como cadena "mm:ss" para su visualización en relojes o temporizadores.
 * @purpose_en Formats seconds into a "mm:ss" string for display in clocks or timers.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:11llyen
 * @lastUpdated 2026-06-23T23:22:55.808Z
 */

/**
 * Formatea segundos a formato mm:ss para visualización en relojes/temporizadores.
 * @example formatTime(125) => "2:05"
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
