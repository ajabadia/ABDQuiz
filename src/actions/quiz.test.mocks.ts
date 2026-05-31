import { vi } from 'vitest';

// ── Mock function refs (declared outside vi.mock for hoisting) ──
export const mockFindById = vi.fn();
export const mockFindOneAndUpdate = vi.fn();
export const mockFinishExam = vi.fn();
export const mockGetIndustrialSession = vi.fn();
export const mockResolveTargetTenantContext = vi.fn();
export const mockEnsureAdminOrProfessor = vi.fn();
export const mockRevalidatePath = vi.fn();
export const mockAudit = vi.fn();

// ── Session fixtures ─────────────────────
export const studentSession = {
  user: { id: 'student-1', tenantId: 'tenant-1', email: 'student@test.com', role: 'STUDENT' },
};
export const adminSession = {
  user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@tenant1.com', role: 'ADMIN' },
};
export const superAdminSession = {
  user: { id: 'super-1', tenantId: 'tenant-1', email: 'super@abd.com', role: 'SUPER_ADMIN' },
};

// ── Document factory ─────────────────────
export function makeAttemptDoc(overrides: Record<string, unknown> = {}) {
  return {
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
