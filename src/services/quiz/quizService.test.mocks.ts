import { vi } from 'vitest';

// ── Shared mock function references ────────────────────
// These are defined here so both basic and advanced test files share the same references.
// IMPORTANT: Each test file must call vi.mock() separately for these to be hoisted correctly.
export const mockFindById = vi.fn();
export const mockFind = vi.fn();
export const mockCountDocuments = vi.fn();
export const mockCreate = vi.fn();
export const mockFindOne = vi.fn();
export const mockAttemptFind = vi.fn();
export const mockAssignFindOne = vi.fn();

// ── Default mocks helper ───────────────────────────────
export function setupDefaultMocks() {
  mockAssignFindOne.mockResolvedValue({
    tenantId: 't1',
    examConfigId: 'config-1',
    status: 'published',
    active: true,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2030-01-01'),
    maxAttempts: 0,
  });
}
