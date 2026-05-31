import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────
vi.mock('@ajabadia/satellite-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ajabadia/satellite-sdk')>();
  return { ...actual, connectDB: vi.fn().mockResolvedValue(undefined), getIndustrialSession: vi.fn(), withTenantContext: vi.fn((fn: () => unknown) => fn()), resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined), logger: { audit: vi.fn().mockResolvedValue(undefined), info: vi.fn(), error: vi.fn(), warn: vi.fn() } };
});
vi.mock('@/models/ExamConfig', () => {
  const m = { mockFindById: vi.fn(), mockFindByIdAndUpdate: vi.fn(), mockCreate: vi.fn() };
  class MockExamConfig { static findById = m.mockFindById; static findByIdAndUpdate = m.mockFindByIdAndUpdate; static create = m.mockCreate; }
  return { default: MockExamConfig, ...m };
});
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import * as ConfigMod from '@/models/ExamConfig';
import * as SessionMod from '@ajabadia/satellite-sdk';

const { mockFindById, mockFindByIdAndUpdate, mockCreate } = ConfigMod as unknown as any;
const { getIndustrialSession } = SessionMod as unknown as any;
const { resolveTargetTenantContext } = SessionMod as unknown as any;

function makeDoc(overrides: Record<string, unknown> = {}) {
  return { _id: 'cfg-1', tenantId: 'tenant-1', name: 'Test Config', active: true, createdBy: 'admin-1', toObject() { return { ...this }; }, ...overrides };
}

const adminSession = { user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@tenant1.com', role: 'ADMIN' } };
const superAdminSession = { user: { id: 'super-1', tenantId: 'tenant-1', email: 'super@abd.com', role: 'SUPER_ADMIN' } };

async function getActions() { return import('./examConfig'); }

describe('updateExamConfigAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return unauthorized if no session', async () => {
    getIndustrialSession.mockResolvedValue(null);
    const { updateExamConfigAction } = await getActions();
    expect(await updateExamConfigAction('cfg-1', { name: 'New' })).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should update for same-tenant admin', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc());
    const { updateExamConfigAction } = await getActions();
    expect(await updateExamConfigAction('cfg-1', { name: 'New Name' })).toEqual({ success: true });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('cfg-1', { name: 'New Name' });
  });

  it('should reject cross-tenant non-SUPER_ADMIN', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc({ tenantId: 'tenant-2' }));
    const { updateExamConfigAction } = await getActions();
    expect(await updateExamConfigAction('cfg-other', { name: 'Hacked' })).toEqual({ success: false, error: 'Acceso no autorizado' });
  });

  it('should allow SUPER_ADMIN cross-tenant', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));
    const { updateExamConfigAction } = await getActions();
    expect(await updateExamConfigAction('cfg-other', { name: 'Updated' }, 'tenant-2')).toEqual({ success: true });
  });

  it('should allow SUPER_ADMIN bypass anti-IDOR', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));
    resolveTargetTenantContext.mockResolvedValueOnce({ tenantId: 'tenant-3', dbPrefix: 't3_', isolationStrategy: 'COLLECTION_PREFIX' });
    const { updateExamConfigAction } = await getActions();
    expect(await updateExamConfigAction('cfg-other', { name: 'X' }, 'tenant-3')).toEqual({ success: true });
  });

  it('should reject non-SUPER_ADMIN with mismatched tenantIdParam', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));
    resolveTargetTenantContext.mockResolvedValueOnce({ tenantId: 'tenant-3', dbPrefix: 't3_', isolationStrategy: 'COLLECTION_PREFIX' });
    const { updateExamConfigAction } = await getActions();
    expect(await updateExamConfigAction('cfg-other', { name: 'X' }, 'tenant-3')).toEqual({ success: false, error: 'Acceso no autorizado' });
  });
});

describe('deleteExamConfigAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should soft-delete for same-tenant admin', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc());
    const { deleteExamConfigAction } = await getActions();
    expect(await deleteExamConfigAction('cfg-1')).toEqual({ success: true });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('cfg-1', { active: false });
  });

  it('should allow SUPER_ADMIN to delete cross-tenant', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));
    const { deleteExamConfigAction } = await getActions();
    expect(await deleteExamConfigAction('cfg-other', 'tenant-2')).toEqual({ success: true });
  });

  it('should reject cross-tenant non-SUPER_ADMIN', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc({ tenantId: 'tenant-2' }));
    const { deleteExamConfigAction } = await getActions();
    expect(await deleteExamConfigAction('cfg-other')).toEqual({ success: false, error: 'Acceso no autorizado' });
  });
});

describe('cloneExamConfigAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should clone for same-tenant admin', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'cfg-1', tenantId: 'tenant-1', name: 'Original', active: true, createdBy: 'admin-1', description: 'A', isDefault: true }) });
    mockCreate.mockResolvedValue({ _id: 'cloned-id', toString: () => 'cloned-id' });
    const { cloneExamConfigAction } = await getActions();
    expect(await cloneExamConfigAction('cfg-1')).toEqual({ success: true, id: 'cloned-id' });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Original (Copia)', isDefault: false }));
  });

  it('should allow SUPER_ADMIN to clone cross-tenant', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'cfg-other', tenantId: 'tenant-2', name: 'Other', active: true, createdBy: 'x', isDefault: true }) });
    mockCreate.mockResolvedValue({ _id: 'cloned-id', toString: () => 'cloned-id' });
    const { cloneExamConfigAction } = await getActions();
    expect(await cloneExamConfigAction('cfg-other', 'tenant-2')).toEqual({ success: true, id: 'cloned-id' });
  });

  it('should reject cross-tenant non-SUPER_ADMIN', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'cfg-other', tenantId: 'tenant-2', name: 'Other' }) });
    const { cloneExamConfigAction } = await getActions();
    expect(await cloneExamConfigAction('cfg-other')).toEqual({ success: false, error: 'Configuración origen no encontrada o acceso no autorizado' });
  });

  it('should return error when source not found', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const { cloneExamConfigAction } = await getActions();
    expect(await cloneExamConfigAction('nonexistent')).toEqual({ success: false, error: 'Configuración origen no encontrada o acceso no autorizado' });
  });
});
