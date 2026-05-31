import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@ajabadia/satellite-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ajabadia/satellite-sdk')>();
  return {
    ...actual,
    connectDB: vi.fn().mockResolvedValue(undefined),
    getIndustrialSession: vi.fn(),
    withTenantContext: vi.fn((fn: () => unknown) => fn()),
    resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/auth/ensureQuizAccess', () => ({
  ensureAdminOrProfessor: vi.fn(),
}));

vi.mock('@/models/ExamAttempt', () => {
  const mockFindById = vi.fn();
  class MockExamAttempt {
    static findById = mockFindById;
  }
  return {
    default: MockExamAttempt,
    mockFindById,
    getTenantModel: vi.fn(),
  };
});

// ── Import mock refs ───────────────────────────────────

import * as SessionMod from '@/lib/auth/ensureQuizAccess';
import * as ResolverMod from '@ajabadia/satellite-sdk';
import * as ExamAttemptMod from '@/models/ExamAttempt';

export const { ensureAdminOrProfessor } = SessionMod as unknown as {
  ensureAdminOrProfessor: ReturnType<typeof vi.fn>;
};
export const { resolveTargetTenantContext } = ResolverMod as unknown as {
  resolveTargetTenantContext: ReturnType<typeof vi.fn>;
};
export const { getIndustrialSession } = ResolverMod as unknown as {
  getIndustrialSession: ReturnType<typeof vi.fn>;
};
export const { mockFindById } = ExamAttemptMod as unknown as {
  mockFindById: ReturnType<typeof vi.fn>;
};

// ── Helpers ────────────────────────────────────────────

function makeMockAttempt(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'attempt-1',
    userId: 'student-1',
    tenantId: 'tenant-1',
    messages: [] as Array<Record<string, unknown>>,
    save: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeMockAttemptWithMessages(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'attempt-1',
    userId: 'student-1',
    tenantId: 'tenant-1',
    messages: [
      { sender: 'student', text: 'Hola profesor', createdAt: new Date('2025-06-01T10:00:00Z'), read: false },
      { sender: 'professor', text: 'Hola alumno', createdAt: new Date('2025-06-01T10:05:00Z'), read: false },
    ] as Array<Record<string, unknown>>,
    save: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const adminSession = {
  id: 'admin-1',
  tenantId: 'tenant-1',
  email: 'admin@tenant1.com',
  role: 'ADMIN' as const,
};

const otherTenantAdminSession = {
  id: 'admin-2',
  tenantId: 'tenant-2',
  email: 'admin@tenant2.com',
  role: 'ADMIN' as const,
};

const studentSession = {
  user: { id: 'student-1', tenantId: 'tenant-1', email: 'student@test.com' },
};

const otherStudentSession = {
  user: { id: 'student-2', tenantId: 'tenant-1', email: 'student2@test.com' },
};

// ── Dynamic import helper ─────────────────────────────

async function getActions() {
  return import('./chat');
}

// ── Tests ──────────────────────────────────────────────

describe('sendMessageAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Validation ────

  it('should reject empty text', async () => {
    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', '');
    expect(result).toEqual({ success: false, error: 'El mensaje no puede estar vacío' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should reject whitespace-only text', async () => {
    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', '   ');
    expect(result).toEqual({ success: false, error: 'El mensaje no puede estar vacío' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  // ── Professor flow ────

  it('should send message as professor when authenticated as admin', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttempt();
    mockFindById.mockResolvedValue(attempt);

    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', 'Revisado tu examen');

    expect(result).toEqual({ success: true });
    expect(mockFindById).toHaveBeenCalledWith('attempt-1');
    expect(attempt.messages).toHaveLength(1);
    expect(attempt.messages[0]).toMatchObject({
      sender: 'professor',
      text: 'Revisado tu examen',
      read: false,
    });
    expect(attempt.save).toHaveBeenCalledTimes(1);
  });

  it('should reject professor from different tenant', async () => {
    ensureAdminOrProfessor.mockResolvedValue(otherTenantAdminSession);
    const attempt = makeMockAttempt({ tenantId: 'tenant-1' });
    mockFindById.mockResolvedValue(attempt);

    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', 'mensaje');

    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(attempt.save).not.toHaveBeenCalled();
  });

  // ── Student flow ────

  it('should send message as student when authenticated as attempt owner', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Not admin'));
    getIndustrialSession.mockResolvedValue(studentSession);
    const attempt = makeMockAttempt({ userId: 'student-1' });
    mockFindById.mockResolvedValue(attempt);

    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', 'Tengo una duda');

    expect(result).toEqual({ success: true });
    expect(attempt.messages).toHaveLength(1);
    expect(attempt.messages[0]).toMatchObject({
      sender: 'student',
      text: 'Tengo una duda',
    });
    expect(attempt.save).toHaveBeenCalledTimes(1);
  });

  it('should reject student sending on another students attempt', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Not admin'));
    getIndustrialSession.mockResolvedValue(otherStudentSession);
    const attempt = makeMockAttempt({ userId: 'student-1' });
    mockFindById.mockResolvedValue(attempt);

    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', 'mensaje');

    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(attempt.save).not.toHaveBeenCalled();
  });

  it('should reject unauthenticated student', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Not admin'));
    getIndustrialSession.mockResolvedValue({ user: null });

    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', 'mensaje');

    expect(result).toEqual({ success: false, error: 'No autorizado' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  // ── Attempt not found ────

  it('should return error when attempt not found', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(null);

    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('nonexistent', 'mensaje');

    expect(result).toEqual({ success: false, error: 'Intento no encontrado' });
  });

  // ── Messages array auto-init ────

  it('should initialize messages array if undefined', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt: Record<string, unknown> = makeMockAttempt();
    delete attempt.messages;
    mockFindById.mockResolvedValue(attempt);

    const { sendMessageAction } = await getActions();
    const result = await sendMessageAction('attempt-1', 'Primer mensaje');

    expect(result).toEqual({ success: true });
    expect(attempt.messages).toBeDefined();
    expect(attempt.messages).toHaveLength(1);
    expect(attempt.save).toHaveBeenCalledTimes(1);
  });

  // ── Trim text ────

  it('should trim message text before saving', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttempt();
    mockFindById.mockResolvedValue(attempt);

    const { sendMessageAction } = await getActions();
    await sendMessageAction('attempt-1', '  mensaje con espacios  ');

    expect(attempt.messages[0].text).toBe('mensaje con espacios');
  });
});

describe('getMessagesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return messages for professor in same tenant', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttemptWithMessages();
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(attempt) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('attempt-1');

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.messages![0]).toMatchObject({
      sender: 'student',
      text: 'Hola profesor',
      read: false,
    });
    expect(result.messages![1]).toMatchObject({
      sender: 'professor',
      text: 'Hola alumno',
    });
  });

  it('should reject professor from different tenant', async () => {
    ensureAdminOrProfessor.mockResolvedValue(otherTenantAdminSession);
    const attempt = makeMockAttemptWithMessages({ tenantId: 'tenant-1' });
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(attempt) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('attempt-1');

    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  it('should return messages for student owner', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Not admin'));
    getIndustrialSession.mockResolvedValue(studentSession);
    const attempt = makeMockAttemptWithMessages({ userId: 'student-1' });
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(attempt) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('attempt-1');

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(2);
  });

  it('should reject student trying to read another students messages', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Not admin'));
    getIndustrialSession.mockResolvedValue(otherStudentSession);
    const attempt = makeMockAttemptWithMessages({ userId: 'student-1' });
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(attempt) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('attempt-1');

    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });

  it('should return empty array when no messages exist', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttempt({ messages: undefined });
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(attempt) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('attempt-1');

    expect(result.success).toBe(true);
    expect(result.messages).toEqual([]);
  });

  it('should handle attempt with null messages', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt: Record<string, unknown> = makeMockAttempt();
    attempt.messages = null;
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(attempt) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('attempt-1');

    expect(result.success).toBe(true);
    expect(result.messages).toEqual([]);
  });

  it('should return error when attempt not found', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('nonexistent');

    expect(result).toEqual({ success: false, error: 'Intento no encontrado' });
  });

  it('should format createdAt as ISO string', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttemptWithMessages();
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(attempt) });

    const { getMessagesAction } = await getActions();
    const result = await getMessagesAction('attempt-1');

    expect(result.messages![0].createdAt).toBe('2025-06-01T10:00:00.000Z');
    expect(result.messages![1].createdAt).toBe('2025-06-01T10:05:00.000Z');
  });
});

describe('markMessagesReadAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark student messages as read when professor views', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttemptWithMessages();
    mockFindById.mockResolvedValue(attempt);

    const { markMessagesReadAction } = await getActions();
    const result = await markMessagesReadAction('attempt-1');

    expect(result).toEqual({ success: true });
    // Professor marks student messages as read
    expect(attempt.messages[0].read).toBe(true); // student → read by professor
    expect(attempt.messages[1].read).toBe(false); // professor → unchanged
    expect(attempt.save).toHaveBeenCalledTimes(1);
  });

  it('should mark professor messages as read when student views', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Not admin'));
    getIndustrialSession.mockResolvedValue(studentSession);
    const attempt = makeMockAttemptWithMessages({ userId: 'student-1' });
    mockFindById.mockResolvedValue(attempt);

    const { markMessagesReadAction } = await getActions();
    const result = await markMessagesReadAction('attempt-1');

    expect(result).toEqual({ success: true });
    // Student marks professor messages as read
    expect(attempt.messages[0].read).toBe(false); // student → unchanged
    expect(attempt.messages[1].read).toBe(true); // professor → read by student
    expect(attempt.save).toHaveBeenCalledTimes(1);
  });

  it('should be a no-op if no messages exist', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttempt({ messages: undefined });
    mockFindById.mockResolvedValue(attempt);

    const { markMessagesReadAction } = await getActions();
    const result = await markMessagesReadAction('attempt-1');

    expect(result).toEqual({ success: true });
    // save is only called when messages exist and were modified
    expect(attempt.save).not.toHaveBeenCalled();
  });

  it('should skip marking if no unread messages from the other role', async () => {
    ensureAdminOrProfessor.mockResolvedValue(adminSession);
    const attempt = makeMockAttempt({
      messages: [
        { sender: 'student', text: 'msg', createdAt: new Date(), read: true },
      ],
    });
    mockFindById.mockResolvedValue(attempt);

    const { markMessagesReadAction } = await getActions();
    const result = await markMessagesReadAction('attempt-1');

    expect(result).toEqual({ success: true });
    expect(attempt.messages[0].read).toBe(true); // already true
    expect(attempt.save).toHaveBeenCalledTimes(1);
  });

  it('should reject unauthorized user', async () => {
    ensureAdminOrProfessor.mockRejectedValue(new Error('Not admin'));
    getIndustrialSession.mockResolvedValue({ user: null });

    const { markMessagesReadAction } = await getActions();
    const result = await markMessagesReadAction('attempt-1');

    expect(result).toEqual({ success: false, error: 'No autorizado' });
  });
});
