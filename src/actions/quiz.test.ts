import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/models/Course', () => ({
  default: {
    findOne: vi.fn().mockResolvedValue({
      _id: 'course-1',
      name: 'Test Course',
      learningPath: ['cfg-1']
    })
  }
}));

vi.mock('@/models/UserCourseSummary', () => ({
  default: {
    findOneAndUpdate: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('@/models/CourseAnalytics', () => ({
  default: {
    findOneAndUpdate: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('@/lib/tenant-resolver', () => ({
  resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@ajabadia/satellite-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ajabadia/satellite-sdk')>();
  return {
    ...actual,
    connectDB: vi.fn().mockResolvedValue(undefined),
    getIndustrialSession: vi.fn(),
    withTenantContext: vi.fn((fn: () => unknown) => fn()),
    logger: {
      audit: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock('@/lib/auth/ensureQuizAccess', () => ({
  ensureAdminOrProfessor: vi.fn(),
}));

vi.mock('@/services/quiz/quizService', () => ({
  QuizService: {
    finishExam: vi.fn(),
  },
}));

vi.mock('@/models/ExamAttempt', () => {
  const mockFindById = vi.fn();
  const mockDoc = {
    _id: 'attempt-1',
    tenantId: 'tenant-1',
    isInvalidated: false,
    invalidatedBy: undefined as string | undefined,
    invalidatedAt: undefined as Date | undefined,
    toObject: vi.fn().mockReturnValue({ _id: 'attempt-1', tenantId: 'tenant-1', status: 'completed' }),
    save: vi.fn().mockResolvedValue(null),
  };

  class MockExamAttempt {
    static findById = mockFindById;
  }

  return {
    default: MockExamAttempt,
    mockFindById,
    mockDoc,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// ── Import mock refs ───────────────────────────────────

import * as SessionMod from '@ajabadia/satellite-sdk';
import * as QuizAccessMod from '@/lib/auth/ensureQuizAccess';
import * as ResolverMod from '@/lib/tenant-resolver';
import * as QuizServiceMod from '@/services/quiz/quizService';
import * as ExamAttemptMod from '@/models/ExamAttempt';
import * as CacheMod from 'next/cache';

const { getIndustrialSession } = SessionMod as unknown as {
  getIndustrialSession: ReturnType<typeof vi.fn>;
};
const { logger: mockLogger } = SessionMod as unknown as {
  logger: { audit: ReturnType<typeof vi.fn> };
};
const { ensureAdminOrProfessor } = QuizAccessMod as unknown as {
  ensureAdminOrProfessor: ReturnType<typeof vi.fn>;
};
const { resolveTargetTenantContext } = ResolverMod as unknown as {
  resolveTargetTenantContext: ReturnType<typeof vi.fn>;
};
const { QuizService } = QuizServiceMod as unknown as {
  QuizService: { finishExam: ReturnType<typeof vi.fn> };
};
const { mockFindById, mockDoc } = ExamAttemptMod as unknown as {
  mockFindById: ReturnType<typeof vi.fn>;
  mockDoc: Record<string, unknown>;
};
const { revalidatePath } = CacheMod as unknown as {
  revalidatePath: ReturnType<typeof vi.fn>;
};

// ── Helpers ────────────────────────────────────────────

function makeAttemptDoc(overrides: Record<string, unknown> = {}) {
  return {
    ...mockDoc,
    _id: 'attempt-1',
    tenantId: 'tenant-1',
    isInvalidated: false,
    invalidatedBy: undefined as string | undefined,
    invalidatedAt: undefined as Date | undefined,
    toObject: vi.fn().mockReturnValue({ _id: 'attempt-1', tenantId: 'tenant-1', status: 'completed' }),
    save: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const studentSession = {
  user: { id: 'student-1', tenantId: 'tenant-1', email: 'student@test.com', role: 'STUDENT' },
};

const adminSession = {
  user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@tenant1.com', role: 'ADMIN' },
};

const superAdminSession = {
  user: { id: 'super-1', tenantId: 'tenant-1', email: 'super@abd.com', role: 'SUPER_ADMIN' },
};

async function getActions() {
  return import('./quiz');
}

// ── Tests: finishQuizAction ────────────────────────────

describe('finishQuizAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw Unauthorized if no session', async () => {
    getIndustrialSession.mockResolvedValue(null);

    const { finishQuizAction } = await getActions();
    await expect(finishQuizAction('attempt-1')).rejects.toThrow('Unauthorized');
    expect(QuizService.finishExam).not.toHaveBeenCalled();
  });

  it('should complete attempt successfully for same-tenant student', async () => {
    getIndustrialSession.mockResolvedValue(studentSession);

    const { finishQuizAction } = await getActions();
    const result = await finishQuizAction('attempt-1');

    expect(result).toEqual({ success: true });
    expect(QuizService.finishExam).toHaveBeenCalledWith('attempt-1', 'student-1', undefined);
    expect(mockLogger.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'EXAM_ATTEMPT_COMPLETED',
        entityId: 'attempt-1',
        userId: 'student-1',
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/quiz/attempt-1');
    expect(revalidatePath).toHaveBeenCalledWith('/quiz/attempt-1/results');
  });

  it('should use session tenantId when tenantIdParam is not provided (passthrough)', async () => {
    getIndustrialSession.mockResolvedValue(studentSession);

    const { finishQuizAction } = await getActions();
    const result = await finishQuizAction('attempt-1');

    expect(result).toEqual({ success: true });
    expect(mockLogger.audit).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
  });

  it('should log with explicitCtx tenantId when SUPER_ADMIN passes tenantIdParam', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-2',
      dbPrefix: 't2_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });

    const { finishQuizAction } = await getActions();
    const result = await finishQuizAction('attempt-1', undefined, 'tenant-2');

    expect(result).toEqual({ success: true });
    expect(QuizService.finishExam).toHaveBeenCalled();
    // Log should use the context-shifted tenantId
    expect(mockLogger.audit).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-2' })
    );
    expect(resolveTargetTenantContext).toHaveBeenCalledWith('tenant-2');
  });

  it('should throw when QuizService.finishExam fails', async () => {
    getIndustrialSession.mockResolvedValue(studentSession);
    QuizService.finishExam.mockRejectedValue(new Error('Database error'));

    const { finishQuizAction } = await getActions();
    await expect(finishQuizAction('attempt-1')).rejects.toThrow('Finalization failed');
  });

  it('should throw when user has no tenantId in session', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'student-1', email: 'student@test.com' },
    });

    const { finishQuizAction } = await getActions();
    await expect(finishQuizAction('attempt-1')).rejects.toThrow('Unauthorized');
  });
});

// ── Tests: invalidateAttemptAction ─────────────────────

describe('invalidateAttemptAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized if ensureAdminOrProfessor throws', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Unauthorized'));

    const { invalidateAttemptAction } = await getActions();
    const result = await invalidateAttemptAction('attempt-1');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should invalidate attempt for same-tenant ADMIN', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    const doc = makeAttemptDoc();
    mockFindById.mockResolvedValue(doc);

    const { invalidateAttemptAction } = await getActions();
    const result = await invalidateAttemptAction('attempt-1');

    expect(result).toEqual({ success: true });
    expect(mockFindById).toHaveBeenCalledWith('attempt-1');
    expect(doc.isInvalidated).toBe(true);
    expect(doc.invalidatedBy).toBe('admin@tenant1.com');
    expect(doc.invalidatedAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalled();
    expect(mockLogger.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'EXAM_ATTEMPT_INVALIDATED',
        entityId: 'attempt-1',
        userId: 'admin-1',
        changedFields: expect.objectContaining({
          isInvalidated: true,
          invalidatedBy: 'admin@tenant1.com',
        }),
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/attempts');
  });

  it('should reject cross-tenant invalidation for ADMIN (anti-IDOR)', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    const doc = makeAttemptDoc({ tenantId: 'tenant-2' });
    mockFindById.mockResolvedValue(doc);

    const { invalidateAttemptAction } = await getActions();
    const result = await invalidateAttemptAction('attempt-1');

    expect(result).toEqual({ success: false, error: 'Acceso no autorizado' });
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('should allow SUPER_ADMIN to invalidate cross-tenant attempt', async () => {
    ensureAdminOrProfessor.mockResolvedValue(superAdminSession.user);
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-2',
      dbPrefix: 't2_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });
    const doc = makeAttemptDoc({ tenantId: 'tenant-2' });
    mockFindById.mockResolvedValue(doc);

    const { invalidateAttemptAction } = await getActions();
    const result = await invalidateAttemptAction('attempt-1', 'tenant-2');

    expect(result).toEqual({ success: true });
    expect(doc.isInvalidated).toBe(true);
    expect(doc.save).toHaveBeenCalled();
    // Log should use target tenant ID (attempt.tenantId), not the session tenant
    expect(mockLogger.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-2',
        action: 'EXAM_ATTEMPT_INVALIDATED',
      })
    );
  });

  it('should return error if attempt not found', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    mockFindById.mockResolvedValue(null);

    const { invalidateAttemptAction } = await getActions();
    const result = await invalidateAttemptAction('nonexistent');

    expect(result).toEqual({
      success: false,
      error: 'Intento de examen no encontrado',
    });
    expect(mockFindById).toHaveBeenCalledWith('nonexistent');
  });

  it('should use fallback invalidatedBy when admin has no email', async () => {
    ensureAdminOrProfessor.mockResolvedValue({
      id: 'admin-1',
      tenantId: 'tenant-1',
      email: '',
      role: 'ADMIN',
    });
    const doc = makeAttemptDoc();
    mockFindById.mockResolvedValue(doc);

    const { invalidateAttemptAction } = await getActions();
    await invalidateAttemptAction('attempt-1');

    expect(doc.invalidatedBy).toBe('admin-1');
  });

  it('should log with targetTenantId even when admin tenant differs', async () => {
    // Simulate a SUPER_ADMIN invalidating an attempt in another tenant
    ensureAdminOrProfessor.mockResolvedValue(superAdminSession.user);
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-3',
      dbPrefix: 't3_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });
    const doc = makeAttemptDoc({ tenantId: 'tenant-3' });
    mockFindById.mockResolvedValue(doc);

    const { invalidateAttemptAction } = await getActions();
    const result = await invalidateAttemptAction('attempt-1', 'tenant-3');

    expect(result).toEqual({ success: true });
    // Log should use attempt.tenantId, not the explicitCtx tenantId passed by admin
    expect(mockLogger.audit).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-3' })
    );
  });

  it('should save and log previous state', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    const previousState = { _id: 'attempt-1', tenantId: 'tenant-1', status: 'completed', score: 85 };
    const doc = makeAttemptDoc({
      toObject: vi.fn().mockReturnValue(previousState),
    });
    mockFindById.mockResolvedValue(doc);

    const { invalidateAttemptAction } = await getActions();
    await invalidateAttemptAction('attempt-1');

    expect(mockLogger.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        previousState,
      })
    );
  });
});
