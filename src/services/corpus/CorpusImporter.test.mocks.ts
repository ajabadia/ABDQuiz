/**
 * @purpose Gestiona mock functions y fábricas de documentos para probar el servicio CorpusImporter en ABDQuiz.
 * @purpose_en Manages mock functions and document factories for testing the CorpusImporter service in ABDQuiz.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:7,imports:1,sig:52c2xa
 * @lastUpdated 2026-06-23T19:53:04.047Z
 */

import { vi } from 'vitest';

// ── Mock function refs ────────────────────────
export const mockCreateImport = vi.fn();
export const mockCreateImportRow = vi.fn();
export const mockFindOneQuestion = vi.fn();
export const mockCreateQuestion = vi.fn();

// ── Mock document factories ───────────────────
export function makeImportDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'import-1',
    status: 'processing',
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function makeValidQuestionInput(overrides: Record<string, unknown> = {}) {
  return {
    pregunta: '¿Cuál es la tensión nominal estándar en baja tensión en la UE?',
    opciones: ['110V', '230V', '400V', '500V'],
    respuesta_correcta: 1,
    modulo: 'Electricidad',
    fuente: 'REBT',
    difficulty: 'easy',
    ...overrides,
  };
}

export const CSV_HEADER_ROW = 'pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,explicacion,modulo,fuente,difficulty,tags';
