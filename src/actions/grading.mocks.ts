import { vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@ajabadia/satellite-sdk', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  getIndustrialSession: vi.fn(),
  withTenantContext: vi.fn((fn: () => unknown) => fn()),
  resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined),
  rateLimitMongodb: {
    getClientIpAsync: vi.fn().mockResolvedValue('127.0.0.1'),
    check: vi.fn().mockResolvedValue(true),
  },
  logger: {
    audit: vi.fn().mockResolvedValue(undefined),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/auth/ensureQuizAccess', () => ({
  ensureAdminOrProfessor: vi.fn(),
}));

vi.mock('@/lib/auth/abac', () => ({
  assertAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/ExamAttempt', () => {
  const mockFind = vi.fn();
  const mockFindById = vi.fn();

  class MockExamAttempt {
    static find = mockFind;
    static findById = mockFindById;
  }

  return {
    default: MockExamAttempt,
    mockFind,
    mockFindById,
    getTenantModel: vi.fn(),
  };
});

// ── Import mock refs ───────────────────────────────────

import * as SessionMod from '@/lib/auth/ensureQuizAccess';
import * as ResolverMod from '@ajabadia/satellite-sdk';
import * as ExamAttemptMod from '@/models/ExamAttempt';
import * as AbacMod from '@/lib/auth/abac';

export const { ensureAdminOrProfessor } = SessionMod as unknown as {
  ensureAdminOrProfessor: ReturnType<typeof vi.fn>;
};
export const { resolveTargetTenantContext } = ResolverMod as unknown as {
  resolveTargetTenantContext: ReturnType<typeof vi.fn>;
};
export const { mockFind, mockFindById } = ExamAttemptMod as unknown as {
  mockFind: ReturnType<typeof vi.fn>;
  mockFindById: ReturnType<typeof vi.fn>;
};
export const { assertAccess } = AbacMod as unknown as {
  assertAccess: ReturnType<typeof vi.fn>;
};

// ── Types ──────────────────────────────────────────────

export interface LeanAttemptDoc {
  _id: string;
  tenantId: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: Date;
  endedAt?: Date;
  status: 'in_progress' | 'completed' | 'timeout';
  gradingStatus: 'auto_graded' | 'pending_manual_review' | 'manually_graded';
  gradedBy?: string;
  gradedAt?: Date;
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: Date;
  examConfigId?: Record<string, unknown> | null;
  questions?: Array<Record<string, unknown>>;
}

export interface MongooseDoc extends LeanAttemptDoc {
  toObject: () => Record<string, unknown>;
  save: ReturnType<typeof vi.fn>;
  questions: Array<Record<string, unknown>>;
  messages?: Array<Record<string, unknown>>;
}

// ── Helpers ────────────────────────────────────────────

export function makeLeanAttempt(overrides: Partial<LeanAttemptDoc> = {}): LeanAttemptDoc {
  return {
    _id: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'student-1',
    mode: 'mock',
    score: 5,
    percentage: 50,
    startedAt: new Date('2025-06-01T10:00:00Z'),
    endedAt: new Date('2025-06-01T10:30:00Z'),
    status: 'completed',
    gradingStatus: 'auto_graded',
    ...overrides,
  };
}

export function makeMongooseDoc(overrides: Partial<MongooseDoc> = {}): MongooseDoc {
  const baseQuestions = [
    {
      questionSnapshot: {
        questionText: 'What is 2+2?',
        type: 'multiple_choice' as const,
        options: ['1', '2', '3', '4'],
        correctOptionIndex: 3,
        difficulty: 'easy' as const,
      },
      selectedOptionIndex: 3,
      isCorrect: true,
      status: 'correcta' as const,
      timeSpentSeconds: 10,
    },
    {
      questionSnapshot: {
        questionText: 'What is 3+3?',
        type: 'multiple_choice' as const,
        options: ['5', '6', '7', '8'],
        correctOptionIndex: 1,
        difficulty: 'medium' as const,
      },
      selectedOptionIndex: 0,
      isCorrect: false,
      status: 'incorrecta' as const,
      timeSpentSeconds: 15,
    },
  ];

  return {
    _id: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'student-1',
    mode: 'mock' as const,
    score: 5,
    percentage: 50,
    startedAt: new Date('2025-06-01T10:00:00Z'),
    endedAt: new Date('2025-06-01T10:30:00Z'),
    status: 'completed' as const,
    gradingStatus: 'auto_graded' as const,
    gradedBy: undefined as string | undefined,
    gradedAt: undefined as Date | undefined,
    toObject: vi.fn().mockReturnValue({ _id: 'attempt-1', tenantId: 'tenant-1' }),
    save: vi.fn().mockResolvedValue(null),
    questions: [...baseQuestions],
    examConfigId: {
      _id: 'cfg-1',
      name: 'Test Config',
      passThreshold: 70,
    },
    ...overrides,
  };
}

export function makeLeanAttemptWithPopulate(overrides: Partial<LeanAttemptDoc> = {}): LeanAttemptDoc {
  return {
    ...makeLeanAttempt({
      examConfigId: {
        _id: 'cfg-1',
        name: 'Test Config',
        passThreshold: 70,
      },
      ...overrides,
    }),
  };
}

export const adminSession = {
  id: 'admin-1',
  tenantId: 'tenant-1',
  email: 'admin@tenant1.com',
  role: 'ADMIN' as const,
};

export const superAdminSession = {
  id: 'super-1',
  tenantId: 'tenant-1',
  email: 'super@abd.com',
  role: 'SUPER_ADMIN' as const,
};
