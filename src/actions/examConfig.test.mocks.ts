import { vi } from 'vitest';

// ── Mock function refs ────────────────────────
export const mockFindById = vi.fn();
export const mockFindByIdAndUpdate = vi.fn();
export const mockCreate = vi.fn();
export const mockGetIndustrialSession = vi.fn();
export const mockResolveTargetTenantContext = vi.fn();

// ── Session fixtures ─────────────────────
export const adminSession = {
  user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@tenant1.com', role: 'ADMIN' },
};
export const superAdminSession = {
  user: { id: 'super-1', tenantId: 'tenant-1', email: 'super@abd.com', role: 'SUPER_ADMIN' },
};

// ── Document factory ─────────────────────
export function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'cfg-1',
    tenantId: 'tenant-1',
    name: 'Test Config',
    active: true,
    createdBy: 'admin-1',
    toObject() { return { ...this }; },
    ...overrides,
  };
}
