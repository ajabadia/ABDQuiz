/**
 * @purpose Proporciona una forma de combinar clases de Tailwind CSS utilizando `clsx` y `tailwind-merge`.
 * @purpose_en Merges and combines Tailwind CSS classes using `clsx` and `tailwind-merge`.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:mt3gra
 * @lastUpdated 2026-06-23T19:51:43.906Z
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
