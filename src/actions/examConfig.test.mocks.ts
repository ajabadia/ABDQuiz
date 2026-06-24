/**
 * @purpose Gestiona mock functions y fijuras para pruebas de configuración de examen.
 * @purpose_en Manages mock functions and fixtures for exam configuration tests.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:8,imports:1,sig:1xaqg4
 * @lastUpdated 2026-06-23T16:27:48.562Z
 */

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
