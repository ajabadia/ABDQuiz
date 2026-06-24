/**
 * @purpose Proporciona una función utilidad para normalizar texto eliminando espacios, puntuaciones, acentos y convirtiendo a mayúsculas para comparación semántica.
 * @purpose_en Provides a utility function to normalize text by removing spaces, punctuation, accents, and converting to uppercase for semantic comparison.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:gm8g11
 * @lastUpdated 2026-06-23T23:22:51.034Z
 */

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

