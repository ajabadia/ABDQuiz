import { vi } from 'vitest';

// ── Mock Fixtures ─────────────────────────────
export const ADMIN_USER = { id: 'admin-1', tenantId: 't1', email: 'admin@t1.com', role: 'ADMIN' };
export const STUDENT_USER = { id: 'student-1', tenantId: 't1', email: 'student@t1.com', role: 'STUDENT' };
export const SUPER_ADMIN_USER = { id: 'super-1', tenantId: 't1', email: 'super@abd.com', role: 'SUPER_ADMIN' };

// ── Mock function refs ────────────────────────
export const mockConnectDB = vi.fn().mockResolvedValue(undefined);
export const mockCreateAllegation = vi.fn();
export const mockFindAllegation = vi.fn();
export const mockFindByIdAllegation = vi.fn();
export const mockFindAttempt = vi.fn();
export const mockFindByIdAttempt = vi.fn();
export const mockFindByIdConfig = vi.fn();
export const mockUpdateOneQuestion = vi.fn();

// ── Shared mock instance factories ────────────
export function makeMockAttempt(overrides: Record<string, unknown> = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    status: 'in_progress',
    questions: [
      { questionId: '507f1f77bcf86cd799439013' },
    ],
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function makeMockAllegation(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'al-pending',
    tenantId: 't1',
    status: 'pending',
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}
