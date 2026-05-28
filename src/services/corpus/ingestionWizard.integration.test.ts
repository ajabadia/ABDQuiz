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
 * Los mocks de findOne devuelven objetos encadenables .select().lean()
 * para imitar la API de Mongoose Query.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Tipos ────────────────────────────────────

interface TestQuestion {
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

// ── Mocks hoisted (se ejecutan antes que vi.mock) ──────────────

const mockSpaceFind = vi.hoisted(() => vi.fn());
const mockSpaceFindOne = vi.hoisted(() => vi.fn());
const mockCourseFind = vi.hoisted(() => vi.fn());
const mockCourseFindOne = vi.hoisted(() => vi.fn());
const mockQuestionFindOne = vi.hoisted(() => vi.fn());
const mockQuestionCreate = vi.hoisted(() => vi.fn());
const mockCreateImport = vi.hoisted(() => vi.fn());
const mockCreateImportRow = vi.hoisted(() => vi.fn());

// ──────────────────────────────────────────────
//  Mocks globales
// ──────────────────────────────────────────────

vi.mock('@/lib/database/mongodb', () => ({
  default: vi.fn().mockResolvedValue(null),
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

vi.mock('@/models/Space', () => {
  class MockSpace {
    static find = mockSpaceFind;
    static findOne = mockSpaceFindOne;
  }
  return { default: MockSpace };
});

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
//  Helpers de mock
// ──────────────────────────────────────────────

/**
 * Crea un objeto mock que imita la cadena Mongoose Query:
 *   Model.findOne(query) → .select(fields) → .lean() → Promise<result>
 */
function mockFindOneResult(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
  } as any;
}

/**
 * Helper para construir cuestiones de test con tipado explícito.
 */
function makeQuestion(overrides: Partial<TestQuestion> = {}): TestQuestion {
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
function makeImportDoc() {
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

// ── Fixtures compartidos ──────────────────────

const ACTIVE_SPACE = {
  _id: 'space-active',
  name: 'Espacio Activo',
  slug: 'espacio-activo',
  type: 'TEAM',
  isActive: true,
};

const ACTIVE_COURSE = {
  _id: 'course-active',
  name: 'Curso Activo',
  spaceId: 'space-active',
  active: true,
};

let ensureAdminOrProfessor: ReturnType<typeof vi.fn>;

// ──────────────────────────────────────────────
//  Tests
// ──────────────────────────────────────────────

describe('Wizard de Ingestión — Integración (select_context → remediation_ids → submit)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import('@/lib/auth/ensureQuizAccess');
    ensureAdminOrProfessor = mod.ensureAdminOrProfessor as ReturnType<typeof vi.fn>;
    ensureAdminOrProfessor.mockResolvedValue({ id: 'admin-1', tenantId: 'tenant-1', email: 'admin@test.com', role: 'ADMIN' });
  });

  // ── Escenario 1: Flujo completo ─────────────────

  it('debe completar el flujo: select_context → remediation_ids → submit', async () => {
    // ── Setup: 3 preguntas con diferentes necesidades ──
    // Q0: sin IDs jerárquicos → necesita select_context
    // Q1: spaceId inválido → necesita remediation_ids
    // Q2: jerarquía válida → pasa directo
    const questions: TestQuestion[] = [
      makeQuestion({ pregunta: 'Q0: Sin jerarquía' }),
      makeQuestion({ pregunta: 'Q1: Space inválido', spaceId: 'space-nonexistent' }),
      makeQuestion({ pregunta: 'Q2: Válida', spaceId: 'space-active', courseId: 'course-active' }),
    ];

    // ── Paso 1: select_context ──
    const needsContextCount = questions.filter(q => !q.spaceId && !q.courseId).length;
    expect(needsContextCount).toBe(1);

    // getActiveSpacesAction
    mockSpaceFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([ACTIVE_SPACE]),
      }),
    } as any);

    const { getActiveSpacesAction } = await import('@/actions/corpus');
    const spacesResult = await getActiveSpacesAction();
    expect(spacesResult.success).toBe(true);
    expect(spacesResult.data).toHaveLength(1);
    expect(spacesResult.data![0]._id).toBe('space-active');

    // Usuario selecciona "space-active" → inyectar en Q0
    const contextInjected: TestQuestion[] = questions.map(q => ({
      ...q,
      spaceId: !q.spaceId && !q.courseId ? 'space-active' : q.spaceId,
      courseId: !q.spaceId && !q.courseId ? 'course-active' : q.courseId,
    }));

    expect(contextInjected[0].spaceId).toBe('space-active');
    expect(contextInjected[0].courseId).toBe('course-active');
    expect(contextInjected[1].spaceId).toBe('space-nonexistent');
    expect(contextInjected[2].spaceId).toBe('space-active');

    // ── Paso 2: remediation_ids ──
    mockSpaceFindOne
      .mockReturnValueOnce(mockFindOneResult(null))              // Q1: space-nonexistent → no encontrado
      .mockReturnValueOnce(mockFindOneResult(ACTIVE_SPACE));     // Q2: space-active → encontrado

    const { validateHierarchyAction } = await import('@/actions/corpus');

    // Validar Q1: space-nonexistent
    const resultQ1 = await validateHierarchyAction('space-nonexistent', undefined);
    expect(resultQ1.success).toBe(true);
    expect(resultQ1.data?.valid).toBe(false);
    expect(resultQ1.data?.errorType).toBe('space_not_found');

    // Validar Q2: space-active + course-active
    mockCourseFindOne.mockReturnValueOnce(mockFindOneResult(ACTIVE_COURSE));
    const resultQ2 = await validateHierarchyAction('space-active', 'course-active');
    expect(resultQ2.success).toBe(true);
    expect(resultQ2.data?.valid).toBe(true);

    // Simular resolución: usuario reasigna Q1 a "space-active"
    const resolved: TestQuestion[] = contextInjected.map((q, i) =>
      i === 1 ? { ...q, spaceId: 'space-active', courseId: 'course-active' } : q
    );

    // ── Paso 3: submit ──
    const importDoc = makeImportDoc();
    mockCreateImport.mockResolvedValue(importDoc);
    // Question.findOne no encadena .select().lean() — solo await
    mockQuestionFindOne.mockResolvedValue(null);
    mockQuestionCreate.mockResolvedValue({ _id: 'final-q' });

    const { importFinalizedQuestionsAction } = await import('@/actions/corpus');

    const submitResult = await importFinalizedQuestionsAction(resolved, 'integrated-test.json');
    expect(submitResult.success).toBe(true);
    expect(submitResult.data?.validRows).toBe(3);

    // En modo standalone Question.create se llama una vez por pregunta con un objeto
    const createCalls = mockQuestionCreate.mock.calls;
    expect(createCalls.length).toBe(3);
    // Al menos una debe tener los IDs jerárquicos inyectados
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

    // Skip contexto: Q0 queda sin IDs
    const afterSkip = [...questions];
    expect(afterSkip[0].spaceId).toBeUndefined();

    // Validar Q1: space-bad no encontrado
    mockSpaceFindOne.mockReturnValueOnce(mockFindOneResult(null));

    const { validateHierarchyAction } = await import('@/actions/corpus');
    const validation = await validateHierarchyAction('space-bad', undefined);
    expect(validation.data?.valid).toBe(false);
    expect(validation.data?.errorType).toBe('space_not_found');

    // Usuario asigna space válido a Q1
    const finalList: TestQuestion[] = afterSkip.map((q, i) =>
      i === 1 ? { ...q, spaceId: 'space-active' } : q
    );

    // Submit
    const importDoc = makeImportDoc();
    mockCreateImport.mockResolvedValue(importDoc);
    mockQuestionFindOne.mockResolvedValue(null);
    mockQuestionCreate.mockResolvedValue({ _id: 'skip-q' });

    const { importFinalizedQuestionsAction } = await import('@/actions/corpus');
    const result = await importFinalizedQuestionsAction(finalList, 'skip.json');

    expect(result.success).toBe(true);
    expect(result.data?.validRows).toBe(2);

    // Q0 sin spaceId → Question.create sin ese campo
    // Q1 con spaceId  → Question.create con spaceId: 'space-active'
    const createCalls = mockQuestionCreate.mock.calls;
    expect(createCalls.length).toBe(2);
    // Una llamada sin spaceId (Q0) y otra con (Q1)
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

    mockSpaceFindOne.mockReturnValueOnce(mockFindOneResult(null));

    const { validateHierarchyAction } = await import('@/actions/corpus');
    const validation = await validateHierarchyAction('space-bad', undefined);
    expect(validation.data?.valid).toBe(false);

    // Recordar decisión: todas a space-active + course-active
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

    // Las 3 preguntas deben tener la misma jerarquía asignada
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

    mockSpaceFindOne.mockReturnValueOnce(mockFindOneResult(ACTIVE_SPACE));
    mockCourseFindOne.mockReturnValueOnce(mockFindOneResult(null)); // course no existe

    const { validateHierarchyAction } = await import('@/actions/corpus');
    const validation = await validateHierarchyAction('space-active', 'course-inactive');
    expect(validation.data?.valid).toBe(false);
    expect(validation.data?.errorType).toBe('course_not_found');

    // Nullify: eliminar courseId
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

    const { getCoursesBySpaceAction } = await import('@/actions/corpus');
    const result = await getCoursesBySpaceAction('space-active');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0]._id).toBe('c1');

    expect(mockCourseFind).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'space-active' })
    );
  });
});
