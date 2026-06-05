/**
 * Tipos, fixtures y helpers compartidos para ingestionWizard.integration.test.ts
 *
 * NOTA: Los vi.mock() globales deben permanecer en el archivo de test
 * para que vitest pueda hoistearlos correctamente.
 */

import { vi } from 'vitest';

// ── Tipos ────────────────────────────────────

export interface TestQuestion {
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  modulo: string;
  fuente: string;
  difficulty: string;
  explicacion?: string;
  tags?: string[];
  spaceId?: string;
  courseId?: string;
}

// ── Fixtures ────────────────────────────────────

export const ACTIVE_SPACE = {
  _id: 'space-active',
  name: 'Espacio Activo',
  slug: 'espacio-activo',
  type: 'TEAM' as const,
  isActive: true,
};

export const ACTIVE_COURSE = {
  _id: 'course-active',
  name: 'Curso Activo',
  spaceId: 'space-active',
  active: true,
};

// ── Helpers ─────────────────────────────────────

/**
 * Crea un objeto mock que imita la cadena Mongoose Query:
 *   Model.findOne(query) → .select(fields) → .lean() → Promise<result>
 */
export function mockFindOneResult(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as never;
}

/**
 * Helper para construir cuestiones de test con tipado explícito.
 */
export function makeQuestion(overrides: Partial<TestQuestion> = {}): TestQuestion {
  return {
    pregunta: '¿Cuál es la capital de Francia?',
    opciones: ['París', 'Londres', 'Berlín', 'Madrid'],
    respuesta_correcta: 0,
    modulo: 'Geografía',
    fuente: 'Test',
    difficulty: 'easy',
    ...overrides,
  };
}

/**
 * Crea un documento de importación mock que incluye los campos
 * que CorpusImporter asigna post-creación.
 */
export function makeImportDoc() {
  return {
    _id: 'import-' + Math.random().toString(36).slice(2, 8),
    status: 'processing',
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    finishedAt: null,
    save: vi.fn().mockResolvedValue(true),
  };
}
