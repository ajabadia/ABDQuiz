/**
 * Test de integración: Flujo completo del Wizard de Ingestión
 *
 * Simula el pipeline completo de datos:
 *   1. select_context — preguntas sin IDs jerárquicos
 *   2. remediation_ids — preguntas con jerarquía inválida
 *   3. submit — importación final vía CorpusImporter
 *
 * No renderiza React — prueba la lógica de negocio del pipeline
 * a través de las Server Actions y servicios reales con dependencias mockeadas.
 *
 * NOTA: Todos los mock functions se declaran con vi.hoisted() para evitar
 * el hoisting conflict entre vi.mock() y las declaraciones const.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockFindOneResult,
  makeQuestion,
  makeImportDoc,
  ACTIVE_SPACE,
  ACTIVE_COURSE,
  type TestQuestion,
} from './ingestionWizard.test.mocks';

// ── Mocks hoisted (se ejecutan antes que vi.mock) ──────────────

const mockGetActiveSpaces = vi.hoisted(() => vi.fn());
const mockGetSpaceById = vi.hoisted(() => vi.fn());
const mockCourseFind = vi.hoisted(() => vi.fn());
const mockCourseFindOne = vi.hoisted(() => vi.fn());
const mockQuestionFindOne = vi.hoisted(() => vi.fn());
const mockQuestionCreate = vi.hoisted(() => vi.fn());
const mockCreateImport = vi.hoisted(() => vi.fn());
const mockCreateImportRow = vi.hoisted(() => vi.fn());

// ──────────────────────────────────────────────
//  Mocks globales (requieren hoisting de vitest)
// ──────────────────────────────────────────────

vi.mock('@ajabadia/satellite-sdk/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/ensureQuizAccess', () => ({
  ensureAdminOrProfessor: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('mongoose', () => {
  const mockStartSession = vi.fn().mockRejectedValue(new Error('Standalone'));
  return {
    default: {
      startSession: mockStartSession,
      Types: { ObjectId: { toString: () => 'mock-id' } },
    },
    startSession: mockStartSession,
  };
});

vi.mock('@/services/space-client', () => ({
  SpaceServiceClient: {
    getActiveSpaces: mockGetActiveSpaces,
    getSpaceById: mockGetSpaceById,
  },
}));

vi.mock('@/models/Course', () => {
  class MockCourse {
    static find = mockCourseFind;
    static findOne = mockCourseFindOne;
  }
  return { default: MockCourse };
});

vi.mock('@/models/Question', () => {
  class MockQuestion {
    static findOne = mockQuestionFindOne;
    static create = mockQuestionCreate;
  }
  return { default: MockQuestion };
});

vi.mock('@/models/CorpusImport', () => {
  class MockCorpusImport {
    static create = mockCreateImport;
    save = vi.fn().mockResolvedValue(true);
  }
  return { default: MockCorpusImport };
});

vi.mock('@/models/CorpusImportRow', () => {
  class MockCorpusImportRow {
    static create = mockCreateImportRow;
  }
  return { default: MockCorpusImportRow };
});

// ──────────────────────────────────────────────
//  Tests
// ──────────────────────────────────────────────

let ensureAdminOrProfessor: ReturnType<typeof vi.fn>;

describe('Wizard de Ingestión — Integración (select_context → remediation_ids → submit)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import('@/lib/auth/ensureQuizAccess');
    ensureAdminOrProfessor = mod.ensureAdminOrProfessor as ReturnType<typeof vi.fn>;
    ensureAdminOrProfessor.mockResolvedValue({ id: 'admin-1', tenantId: 'tenant-1', email: 'admin@test.com', role: 'ADMIN' });
  });

  // ── Escenario 1: Flujo completo ─────────────────

  it('debe completar el flujo: select_context → remediation_ids → submit', async () => {
    const questions: TestQuestion[] = [
      makeQuestion({ pregunta: 'Q0: Sin jerarquía' }),
      makeQuestion({ pregunta: 'Q1: Space inválido', spaceId: 'space-nonexistent' }),
      makeQuestion({ pregunta: 'Q2: Válida', spaceId: 'space-active', courseId: 'course-active' }),
    ];

    const needsContextCount = questions.filter(q => !q.spaceId && !q.courseId).length;
    expect(needsContextCount).toBe(1);

    // Step 1: select_context
    mockGetActiveSpaces.mockResolvedValue([ACTIVE_SPACE]);

    const { getActiveSpacesAction } = await import('@/actions/hierarchyValidation');
    const spacesResult = await getActiveSpacesAction();
    expect(spacesResult.success).toBe(true);
    expect(spacesResult.data).toHaveLength(1);
    expect(spacesResult.data![0]._id).toBe('space-active');

    const contextInjected: TestQuestion[] = questions.map(q => ({
      ...q,
      spaceId: !q.spaceId && !q.courseId ? 'space-active' : q.spaceId,
      courseId: !q.spaceId && !q.courseId ? 'course-active' : q.courseId,
    }));

    expect(contextInjected[0].spaceId).toBe('space-active');
    expect(contextInjected[1].spaceId).toBe('space-nonexistent');
    expect(contextInjected[2].spaceId).toBe('space-active');

    // Step 2: remediation_ids
    mockGetSpaceById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ACTIVE_SPACE);

    const { validateHierarchyAction } = await import('@/actions/hierarchyValidation');

    const resultQ1 = await validateHierarchyAction('space-nonexistent', undefined);
    expect(resultQ1.success).toBe(true);
    expect(resultQ1.data?.valid).toBe(false);
    expect(resultQ1.data?.errorType).toBe('space_not_found');

    mockCourseFindOne.mockReturnValueOnce(mockFindOneResult(ACTIVE_COURSE));
    const resultQ2 = await validateHierarchyAction('space-active', 'course-active');
    expect(resultQ2.success).toBe(true);
    expect(resultQ2.data?.valid).toBe(true);

    const resolved: TestQuestion[] = contextInjected.map((q, i) =>
      i === 1 ? { ...q, spaceId: 'space-active', courseId: 'course-active' } : q
    );

    // Step 3: submit
    const importDoc = makeImportDoc();
    mockCreateImport.mockResolvedValue(importDoc);
    mockQuestionFindOne.mockResolvedValue(null);
    mockQuestionCreate.mockResolvedValue({ _id: 'final-q' });

    const { importFinalizedQuestionsAction } = await import('@/actions/corpus');

    const submitResult = await importFinalizedQuestionsAction(resolved, 'integrated-test.json');
    expect(submitResult.success).toBe(true);
    expect(submitResult.data?.validRows).toBe(3);

    const createCalls = mockQuestionCreate.mock.calls;
    expect(createCalls.length).toBe(3);
    expect(createCalls.some(call => call[0].spaceId === 'space-active' && call[0].courseId === 'course-active')).toBe(true);
  });

  // ── Escenario 2: Importación limpia ─────────────────

  it('debe saltar todos los wizard states si todas las preguntas tienen jerarquía válida', async () => {
    const questions: TestQuestion[] = [
      makeQuestion({ spaceId: 'space-active', courseId: 'course-active' }),
      makeQuestion({ spaceId: 'space-active', courseId: 'course-active' }),
    ];

    const needsContextCount = questions.filter(q => !q.spaceId && !q.courseId).length;
    expect(needsContextCount).toBe(0);

    const importDoc = makeImportDoc();
    mockCreateImport.mockResolvedValue(importDoc);
    mockQuestionFindOne.mockResolvedValue(null);
    mockQuestionCreate.mockResolvedValue({ _id: 'clean-q' });

    const { importFinalizedQuestionsAction } = await import('@/actions/corpus');
    const result = await importFinalizedQuestionsAction(questions, 'clean.json');

    expect(result.success).toBe(true);
    expect(result.data?.validRows).toBe(2);
  });

  // ── Escenario 3: Skip context + remediation_ids ─────

  it('debe permitir saltar select_context y pasar directo a remediation_ids si hay IDs inválidos', async () => {
    const questions: TestQuestion[] = [
      makeQuestion({ pregunta: 'Q0: Sin IDs' }),
      makeQuestion({ pregunta: 'Q1: Space inválido', spaceId: 'space-bad' }),
    ];

    const afterSkip = [...questions];
    expect(afterSkip[0].spaceId).toBeUndefined();

    mockGetSpaceById.mockResolvedValueOnce(null);

    const { validateHierarchyAction } = await import('@/actions/hierarchyValidation');
    const validation = await validateHierarchyAction('space-bad', undefined);
    expect(validation.data?.valid).toBe(false);
    expect(validation.data?.errorType).toBe('space_not_found');

    const finalList: TestQuestion[] = afterSkip.map((q, i) =>
      i === 1 ? { ...q, spaceId: 'space-active' } : q
    );

    const importDoc = makeImportDoc();
    mockCreateImport.mockResolvedValue(importDoc);
    mockQuestionFindOne.mockResolvedValue(null);
    mockQuestionCreate.mockResolvedValue({ _id: 'skip-q' });

    const { importFinalizedQuestionsAction } = await import('@/actions/corpus');
    const result = await importFinalizedQuestionsAction(finalList, 'skip.json');

    expect(result.success).toBe(true);
    expect(result.data?.validRows).toBe(2);

    const createCalls = mockQuestionCreate.mock.calls;
    expect(createCalls.length).toBe(2);
    const withoutSpace = createCalls.find(call => call[0].spaceId == null);
    const withSpace = createCalls.find(call => call[0].spaceId === 'space-active');
    expect(withoutSpace).toBeDefined();
    expect(withSpace).toBeDefined();
  });

  // ── Escenario 4: Recordar decisión ──

  it('debe aplicar "recordar decisión" a todos los conflictos restantes', async () => {
    const questions: TestQuestion[] = [
      makeQuestion({ spaceId: 'space-bad' }),
      makeQuestion({ spaceId: 'space-bad' }),
      makeQuestion({ spaceId: 'space-bad' }),
    ];

    mockGetSpaceById.mockResolvedValueOnce(null);

    const { validateHierarchyAction } = await import('@/actions/hierarchyValidation');
    const validation = await validateHierarchyAction('space-bad', undefined);
    expect(validation.data?.valid).toBe(false);

    const resolved: TestQuestion[] = questions.map(q => ({
      ...q,
      spaceId: 'space-active',
      courseId: 'course-active',
    }));

    const importDoc = makeImportDoc();
    mockCreateImport.mockResolvedValue(importDoc);
    mockQuestionFindOne.mockResolvedValue(null);
    mockQuestionCreate.mockResolvedValue({ _id: 'batch-q' });

    const { importFinalizedQuestionsAction } = await import('@/actions/corpus');
    const result = await importFinalizedQuestionsAction(resolved, 'batch.json');

    expect(result.success).toBe(true);
    expect(result.data?.validRows).toBe(3);

    const batchCalls = mockQuestionCreate.mock.calls;
    expect(batchCalls.length).toBe(3);
    for (const call of batchCalls) {
      expect(call[0].spaceId).toBe('space-active');
      expect(call[0].courseId).toBe('course-active');
    }
  });

  // ── Escenario 5: Anular courseId ──

  it('debe permitir anular el courseId y mantener solo el spaceId', async () => {
    const question = makeQuestion({ spaceId: 'space-active', courseId: 'course-inactive' });

    mockGetSpaceById.mockResolvedValueOnce(ACTIVE_SPACE);
    mockCourseFindOne.mockReturnValueOnce(mockFindOneResult(null));

    const { validateHierarchyAction } = await import('@/actions/hierarchyValidation');
    const validation = await validateHierarchyAction('space-active', 'course-inactive');
    expect(validation.data?.valid).toBe(false);
    expect(validation.data?.errorType).toBe('course_not_found');

    const nullified: TestQuestion = { ...question, courseId: undefined };

    const importDoc = makeImportDoc();
    mockCreateImport.mockResolvedValue(importDoc);
    mockQuestionFindOne.mockResolvedValue(null);
    mockQuestionCreate.mockResolvedValue({ _id: 'nullified-q' });

    const { importFinalizedQuestionsAction } = await import('@/actions/corpus');
    const result = await importFinalizedQuestionsAction([nullified], 'nullify.json');

    expect(result.success).toBe(true);
    expect(result.data?.validRows).toBe(1);

    const callArg = mockQuestionCreate.mock.calls[0][0];
    expect(callArg.spaceId).toBe('space-active');
    expect(callArg.courseId == null).toBe(true);
  });

  // ── Escenario 6: Filtrado de cursos ──

  it('debe devolver solo los cursos activos de un espacio específico', async () => {
    const courseInSpace = { _id: 'c1', name: 'Curso A', active: true };

    mockCourseFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([courseInSpace]),
      }),
    } as any);

    const { getCoursesBySpaceAction } = await import('@/actions/hierarchyValidation');
    const result = await getCoursesBySpaceAction('space-active');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0]._id).toBe('c1');

    expect(mockCourseFind).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'space-active' })
    );
  });
});
