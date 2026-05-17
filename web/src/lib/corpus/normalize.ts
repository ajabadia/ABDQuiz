/**
 * Utilidades para normalizar contenido semántico antes de generar el hash
 */

/**
 * Normaliza un string para comparación: trim, lowercase, unificar espacios
 */
export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Unifica múltiples espacios en uno solo
    .replace(/[\u2010-\u2015]/g, '-') // Normaliza guiones
    .normalize('NFC'); // Normaliza caracteres unicode
}

/**
 * Normaliza un array de opciones
 */
export function normalizeOptions(options: string[]): string[] {
  return options.map(opt => normalizeString(opt));
}
