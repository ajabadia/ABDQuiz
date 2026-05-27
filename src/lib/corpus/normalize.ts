/**
 * Utilidades para normalizar contenido semántico antes de generar el hash
 */

/**
 * Aplana un texto eliminando espacios, saltos de línea, puntuación y acentos,
 * convirtiendo todo a mayúsculas para comparación semántica.
 */
export function flattenText(str: string): string {
  if (!str) return "";
  return str
    .toUpperCase()
    .normalize('NFD') // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (acentos)
    .replace(/Ñ/g, 'N') // Reemplaza Ñ por N
    .replace(/[\.,;:_\-\?\!\(\)\[\]\{\}'"¿¡]/g, '') // Elimina puntuación
    .replace(/\s+/g, ''); // Elimina todo espacio en blanco, tabulación y salto de línea
}

