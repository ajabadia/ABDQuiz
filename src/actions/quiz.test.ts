import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────
vi.mock('@/models/Course', () => ({ default: { findOne: vi.fn().mockResolvedValue({ _id: 'course-1', name: 'Test Course', learningPath: ['cfg-1'] }) } }));
vi.mock('@/models/UserCourseSummary', () => ({ default: { findOneAndUpdate: vi.fn().mockResolvedValue({}) } }));
vi.mock('@/models/CourseAnalytics', () => ({ default: { findOneAndUpdate: vi.fn().mockResolvedValue({}) } }));
vi.mock('@ajabadia/satellite-sdk', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  getIndustrialSession: vi.fn(),
  withTenantContext: vi.fn((fn: () => unknown) => fn()),
  resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined),
  rateLimitMongodb: {
    getClientIpAsync: vi.fn().mockResolvedValue('127.0.0.1'),
    check: vi.fn().mockResolvedValue(true),
  },
  logger: { audit: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/lib/auth/ensureQuizAccess', () => ({ ensureAdminOrProfessor: vi.fn() }));
vi.mock('@/services/quiz/quizService', () => ({ QuizService: { finishExam: vi.fn() } }));
vi.mock('@/models/ExamAttempt', () => {
  const mockFindById = vi.fn();
  const mockDoc = { _id: 'attempt-1', tenantId: 'tenant-1', isInvalidated: false, toObject: vi.fn().mockReturnValue({ _id: 'attempt-1', tenantId: 'tenant-1', status: 'completed' }), save: vi.fn().mockResolvedValue(null) };
  class MockExamAttempt { static findById = mockFindById; }
  return { default: MockExamAttempt, mockFindById, mockDoc };
});
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import * as SessionMod from '@ajabadia/satellite-sdk';
import * as QuizAccessMod from '@/lib/auth/ensureQuizAccess';
import * as QuizServiceMod from '@/services/quiz/quizService';
import * as ExamAttemptMod from '@/models/ExamAttempt';
import * as CacheMod from 'next/cache';

const { getIndustrialSession } = SessionMod as unknown as any;
const { logger: mockLogger } = SessionMod as unknown as any;
const { ensureAdminOrProfessor } = QuizAccessMod as unknown as any;
const { resolveTargetTenantContext } = SessionMod as unknown as any;
const { QuizService } = QuizServiceMod as unknown as any;
const { mockFindById, mockDoc } = ExamAttemptMod as unknown as any;
const { revalidatePath } = CacheMod as unknown as any;

function makeAttemptDoc(overrides: Record<string, unknown> = {}) {
  return { ...mockDoc, ...overrides };
}

const studentSession = { user: { id: 'student-1', tenantId: 'tenant-1', email: 'student@test.com', role: 'STUDENT' } };
const adminSession = { user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@tenant1.com', role: 'ADMIN' } };
const superAdminSession = { user: { id: 'super-1', tenantId: 'tenant-1', email: 'super@abd.com', role: 'SUPER_ADMIN' } };

async function getActions() { return import('./quiz'); }

describe('finishQuizAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should throw Unauthorized if no session', async () => {
    getIndustrialSession.mockResolvedValue(null);
    const { finishQuizAction } = await getActions();
    await expect(finishQuizAction('attempt-1')).rejects.toThrow('Unauthorized');
  });

  it('should complete attempt for same-tenant student', async () => {
    getIndustrialSession.mockResolvedValue(studentSession);
    const { finishQuizAction } = await getActions();
    const result = await finishQuizAction('attempt-1');
    expect(result).toEqual({ success: true });
    expect(QuizService.finishExam).toHaveBeenCalledWith('attempt-1', 'student-1', undefined);
    expect(revalidatePath).toHaveBeenCalledWith('/quiz/attempt-1');
  });

  it('should use session tenantId when tenantIdParam not provided', async () => {
    getIndustrialSession.mockResolvedValue(studentSession);
    const { finishQuizAction } = await getActions();
    const result = await finishQuizAction('attempt-1');
    expect(result).toEqual({ success: true });
    expect(mockLogger.audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
  });

  it('should log with explicitCtx tenantId for SUPER_ADMIN', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    resolveTargetTenantContext.mockResolvedValueOnce({ tenantId: 'tenant-2', dbPrefix: 't2_', isolationStrategy: 'COLLECTION_PREFIX' });
    const { finishQuizAction } = await getActions();
    await finishQuizAction('attempt-1', undefined, 'tenant-2');
    expect(mockLogger.audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-2' }));
  });

  it('should throw when QuizService.finishExam fails', async () => {
    getIndustrialSession.mockResolvedValue(studentSession);
    QuizService.finishExam.mockRejectedValue(new Error('Database error'));
    const { finishQuizAction } = await getActions();
    await expect(finishQuizAction('attempt-1')).rejects.toThrow('Finalization failed');
  });

  it('should throw when user has no tenantId', async () => {
    getIndustrialSession.mockResolvedValue({ user: { id: 'student-1', email: 'student@test.com' } });
    const { finishQuizAction } = await getActions();
    await expect(finishQuizAction('attempt-1')).rejects.toThrow('Unauthorized');
  });
});

describe('invalidateAttemptAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return unauthorized if ensureAdminOrProfessor throws', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Unauthorized'));
    const { invalidateAttemptAction } = await getActions();
    expect(await invalidateAttemptAction('attempt-1')).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should invalidate attempt for ADMIN', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    const doc = makeAttemptDoc(); mockFindById.mockResolvedValue(doc);
    const { invalidateAttemptAction } = await getActions();
    const result = await invalidateAttemptAction('attempt-1');
    expect(result).toEqual({ success: true });
    expect(doc.isInvalidated).toBe(true);
    expect(doc.invalidatedBy).toBe('admin@tenant1.com');
    expect(doc.save).toHaveBeenCalled();
  });

  it('should reject cross-tenant invalidation for ADMIN', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    mockFindById.mockResolvedValue(makeAttemptDoc({ tenantId: 'tenant-2' }));
    const { invalidateAttemptAction } = await getActions();
    expect(await invalidateAttemptAction('attempt-1')).toEqual({ success: false, error: 'Acceso no autorizado' });
  });

  it('should allow SUPER_ADMIN cross-tenant invalidation', async () => {
    ensureAdminOrProfessor.mockResolvedValue(superAdminSession.user);
    resolveTargetTenantContext.mockResolvedValueOnce({ tenantId: 'tenant-2', dbPrefix: 't2_', isolationStrategy: 'COLLECTION_PREFIX' });
    const doc = makeAttemptDoc({ tenantId: 'tenant-2' }); mockFindById.mockResolvedValue(doc);
    const { invalidateAttemptAction } = await getActions();
    expect(await invalidateAttemptAction('attempt-1', 'tenant-2')).toEqual({ success: true });
  });

  it('should return error if attempt not found', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    mockFindById.mockResolvedValue(null);
    const { invalidateAttemptAction } = await getActions();
    expect(await invalidateAttemptAction('nonexistent')).toEqual({ success: false, error: 'Intento de examen no encontrado' });
  });

  it('should use fallback invalidatedBy when admin has no email', async () => {
    ensureAdminOrProfessor.mockResolvedValue({ id: 'admin-1', tenantId: 'tenant-1', email: '', role: 'ADMIN' });
    const doc = makeAttemptDoc(); mockFindById.mockResolvedValue(doc);
    const { invalidateAttemptAction } = await getActions();
    await invalidateAttemptAction('attempt-1');
    expect(doc.invalidatedBy).toBe('admin-1');
  });

  it('should save previous state in audit log', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession.user);
    const prevState = { _id: 'attempt-1', tenantId: 'tenant-1', status: 'completed', score: 85 };
    const doc = makeAttemptDoc({ toObject: vi.fn().mockReturnValue(prevState) });
    mockFindById.mockResolvedValue(doc);
    const { invalidateAttemptAction } = await getActions();
    await invalidateAttemptAction('attempt-1');
    expect(mockLogger.audit).toHaveBeenCalledWith(expect.objectContaining({ previousState: prevState }));
  });
});
