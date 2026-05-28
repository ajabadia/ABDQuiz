import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/lib/database/mongodb', () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/database/tenant-model', () => ({
  withTenantContext: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@/lib/tenant-resolver', () => ({
  resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@ajabadia/satellite-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ajabadia/satellite-sdk')>();
  return {
    ...actual,
    getIndustrialSession: vi.fn(),
  };
});

vi.mock('@/models/ExamConfig', () => {
  const mockFindById = vi.fn();
  const mockFindByIdAndUpdate = vi.fn();
  const mockCreate = vi.fn();

  class MockExamConfig {
    static findById = mockFindById;
    static findByIdAndUpdate = mockFindByIdAndUpdate;
    static create = mockCreate;
  }

  return {
    default: MockExamConfig,
    mockFindById,
    mockFindByIdAndUpdate,
    mockCreate,
  };
});

vi.mock('@/lib/logs-client', () => ({
  LogsClient: {
    log: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ── Import mock refs ───────────────────────────────────

import * as ExamConfigMod from '@/models/ExamConfig';
import * as SessionMod from '@ajabadia/satellite-sdk';
import * as ResolverMod from '@/lib/tenant-resolver';

const { mockFindById, mockFindByIdAndUpdate, mockCreate } = ExamConfigMod as unknown as {
  mockFindById: ReturnType<typeof vi.fn>;
  mockFindByIdAndUpdate: ReturnType<typeof vi.fn>;
  mockCreate: ReturnType<typeof vi.fn>;
};
const { getIndustrialSession } = SessionMod as unknown as {
  getIndustrialSession: ReturnType<typeof vi.fn>;
};
const { resolveTargetTenantContext } = ResolverMod as unknown as {
  resolveTargetTenantContext: ReturnType<typeof vi.fn>;
};

// ── Helper ─────────────────────────────────────────────

function makeDoc(overrides: Record<string, unknown> = {}) {
  const doc: Record<string, unknown> = {
    _id: 'cfg-1',
    tenantId: 'tenant-1',
    name: 'Test Config',
    active: true,
    createdBy: 'admin-1',
    toObject: function () {
      return { ...this };
    },
    ...overrides,
  };
  return doc;
}

const adminSession = {
  user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@tenant1.com', role: 'ADMIN' },
};

const superAdminSession = {
  user: { id: 'super-1', tenantId: 'tenant-1', email: 'super@abd.com', role: 'SUPER_ADMIN' },
};

// ── Tests ──────────────────────────────────────────────

async function getActions() {
  return import('./examConfig');
}

describe('updateExamConfigAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized if no session', async () => {
    getIndustrialSession.mockResolvedValue(null);

    const { updateExamConfigAction } = await getActions();
    const result = await updateExamConfigAction('cfg-1', { name: 'New Name' });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should update config successfully for same-tenant admin', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc());
    mockFindByIdAndUpdate.mockResolvedValue(null);

    const { updateExamConfigAction } = await getActions();
    const result = await updateExamConfigAction('cfg-1', { name: 'New Name' });

    expect(result).toEqual({ success: true });
    expect(mockFindById).toHaveBeenCalledWith('cfg-1');
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('cfg-1', { name: 'New Name' });
  });

  it('should reject update for cross-tenant non-SUPER_ADMIN', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc({ tenantId: 'tenant-2' }));

    const { updateExamConfigAction } = await getActions();
    const result = await updateExamConfigAction('cfg-other', { name: 'Hacked' });

    expect(result).toEqual({ success: false, error: 'Acceso no autorizado' });
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('should allow SUPER_ADMIN to update cross-tenant config with tenantIdParam', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));
    mockFindByIdAndUpdate.mockResolvedValue(null);

    const { updateExamConfigAction } = await getActions();
    const result = await updateExamConfigAction('cfg-other', { name: 'Updated' }, 'tenant-2');

    expect(result).toEqual({ success: true });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('cfg-other', { name: 'Updated' });
  });

  it('should allow SUPER_ADMIN to update even with mismatched tenantIdParam (bypasses anti-IDOR)', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));
    mockFindByIdAndUpdate.mockResolvedValue(null);

    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-3',
      dbPrefix: 't3_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });

    const { updateExamConfigAction } = await getActions();
    const result = await updateExamConfigAction('cfg-other', { name: 'Mismatched' }, 'tenant-3');

    // SUPER_ADMIN bypasses the anti-IDOR guard regardless of tenantIdParam
    expect(result).toEqual({ success: true });
    expect(mockFindByIdAndUpdate).toHaveBeenCalled();
  });

  it('should reject update when non-SUPER_ADMIN uses mismatched tenantIdParam', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));

    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-3',
      dbPrefix: 't3_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });

    const { updateExamConfigAction } = await getActions();
    const result = await updateExamConfigAction('cfg-other', { name: 'Mismatched' }, 'tenant-3');

    expect(result).toEqual({ success: false, error: 'Acceso no autorizado' });
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('deleteExamConfigAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft-delete config for same-tenant admin', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc());
    mockFindByIdAndUpdate.mockResolvedValue(null);

    const { deleteExamConfigAction } = await getActions();
    const result = await deleteExamConfigAction('cfg-1');

    expect(result).toEqual({ success: true });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('cfg-1', { active: false });
  });

  it('should allow SUPER_ADMIN to soft-delete cross-tenant config', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);
    mockFindById.mockResolvedValue(makeDoc({ _id: 'cfg-other', tenantId: 'tenant-2' }));
    mockFindByIdAndUpdate.mockResolvedValue(null);

    const { deleteExamConfigAction } = await getActions();
    const result = await deleteExamConfigAction('cfg-other', 'tenant-2');

    expect(result).toEqual({ success: true });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('cfg-other', { active: false });
  });

  it('should reject delete for cross-tenant non-SUPER_ADMIN', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);
    mockFindById.mockResolvedValue(makeDoc({ tenantId: 'tenant-2' }));

    const { deleteExamConfigAction } = await getActions();
    const result = await deleteExamConfigAction('cfg-other');

    expect(result).toEqual({ success: false, error: 'Acceso no autorizado' });
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('cloneExamConfigAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clone config for same-tenant admin', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'cfg-1',
        tenantId: 'tenant-1',
        name: 'Original',
        active: true,
        createdBy: 'admin-1',
        description: 'A config',
        isDefault: true,
      }),
    });

    mockCreate.mockResolvedValue({ _id: 'cloned-id', toString: () => 'cloned-id' });

    const { cloneExamConfigAction } = await getActions();
    const result = await cloneExamConfigAction('cfg-1');

    expect(result).toEqual({ success: true, id: 'cloned-id' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Original (Copia)',
        tenantId: 'tenant-1',
        isDefault: false,
      })
    );
  });

  it('should allow SUPER_ADMIN to clone cross-tenant config', async () => {
    getIndustrialSession.mockResolvedValue(superAdminSession);

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'cfg-other',
        tenantId: 'tenant-2',
        name: 'Other Config',
        active: true,
        createdBy: 'someone',
        description: 'Other tenant config',
        isDefault: true,
      }),
    });

    mockCreate.mockResolvedValue({ _id: 'cloned-id', toString: () => 'cloned-id' });

    const { cloneExamConfigAction } = await getActions();
    const result = await cloneExamConfigAction('cfg-other', 'tenant-2');

    expect(result).toEqual({ success: true, id: 'cloned-id' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-2',
        isDefault: false,
      })
    );
  });

  it('should reject clone for cross-tenant non-SUPER_ADMIN', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'cfg-other',
        tenantId: 'tenant-2',
        name: 'Other Config',
      }),
    });

    const { cloneExamConfigAction } = await getActions();
    const result = await cloneExamConfigAction('cfg-other');

    expect(result).toEqual({
      success: false,
      error: 'Configuración origen no encontrada o acceso no autorizado',
    });
  });

  it('should return error when source config not found', async () => {
    getIndustrialSession.mockResolvedValue(adminSession);

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const { cloneExamConfigAction } = await getActions();
    const result = await cloneExamConfigAction('nonexistent');

    expect(result).toEqual({
      success: false,
      error: 'Configuración origen no encontrada o acceso no autorizado',
    });
  });
});
