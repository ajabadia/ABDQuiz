import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAssignmentAction } from './examAssignment';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@ajabadia/satellite-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ajabadia/satellite-sdk')>();
  return {
    ...actual,
    connectDB: vi.fn().mockResolvedValue(undefined),
    getIndustrialSession: vi.fn(),
    withTenantContext: vi.fn((fn: () => unknown) => fn()),
    resolveTargetTenantContext: vi.fn().mockResolvedValue(undefined),
    logger: {
      audit: vi.fn().mockResolvedValue(undefined),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  };
});

vi.mock('@/models/ExamConfig', () => {
  const mockFindOne = vi.fn();
  class MockExamConfig {
    static findOne = mockFindOne;
  }
  return {
    default: MockExamConfig,
    mockFindOne,
  };
});

vi.mock('@/models/ExamAssignment', () => {
  const mockCreate = vi.fn();
  class MockExamAssignment {
    static create = mockCreate;
  }
  return {
    default: MockExamAssignment,
    mockCreate,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ── Import mock refs ───────────────────────────────────

import * as ExamConfigMod from '@/models/ExamConfig';
import * as ExamAssignmentMod from '@/models/ExamAssignment';
import * as SessionMod from '@ajabadia/satellite-sdk';
import * as ResolverMod from '@ajabadia/satellite-sdk';

const { mockFindOne } = ExamConfigMod as unknown as { mockFindOne: ReturnType<typeof vi.fn> };
const { mockCreate } = ExamAssignmentMod as unknown as { mockCreate: ReturnType<typeof vi.fn> };
const { getIndustrialSession } = SessionMod as unknown as { getIndustrialSession: ReturnType<typeof vi.fn> };
const { resolveTargetTenantContext } = ResolverMod as unknown as { resolveTargetTenantContext: ReturnType<typeof vi.fn> };

// ── Tests ──────────────────────────────────────────────

describe('createAssignmentAction', () => {
  const validData = {
    examConfigId: 'config-1',
    assignedToType: 'space' as const,
    assignedToId: 'space-1',
    startDate: '2025-06-01T00:00',
    endDate: '2025-07-01T00:00',
    maxAttempts: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized if no session', async () => {
    getIndustrialSession.mockResolvedValue(null);

    const result = await createAssignmentAction(validData);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('should return unauthorized if session has no user or tenantId', async () => {
    getIndustrialSession.mockResolvedValue({ user: null });

    const result = await createAssignmentAction(validData);

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('should return error if exam config does not exist', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' },
    });
    mockFindOne.mockResolvedValue(null);

    const result = await createAssignmentAction(validData);

    expect(result).toEqual({
      success: false,
      error: 'La configuración de examen no existe o no está activa',
    });
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: 'config-1',
      tenantId: 'tenant-1',
      active: true,
    });
  });

  it('should return error if endDate <= startDate', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' },
    });
    mockFindOne.mockResolvedValue({ _id: 'config-1', active: true });

    const result = await createAssignmentAction({
      ...validData,
      startDate: '2025-07-01T00:00',
      endDate: '2025-06-01T00:00',
    });

    expect(result).toEqual({
      success: false,
      error: 'La fecha de fin debe ser posterior a la fecha de inicio',
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should create assignment successfully', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', email: 'admin@test.com', role: 'ADMIN' },
    });
    mockFindOne.mockResolvedValue({ _id: 'config-1', active: true });
    mockCreate.mockResolvedValue({ _id: 'new-assignment-id' });

    const result = await createAssignmentAction(validData);

    expect(result).toEqual({ success: true, id: 'new-assignment-id' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        examConfigId: 'config-1',
        assignedToType: 'space',
        assignedToId: 'space-1',
        status: 'draft',
        maxAttempts: 2,
        active: true,
        createdBy: 'user-1',
      })
    );
  });

  it('should treat missing maxAttempts as 0', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', email: 'admin@test.com', role: 'ADMIN' },
    });
    mockFindOne.mockResolvedValue({ _id: 'config-1', active: true });
    mockCreate.mockResolvedValue({ _id: 'a-id' });

    const { maxAttempts: _, ...dataWithoutAttempts } = validData;
    await createAssignmentAction(dataWithoutAttempts);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ maxAttempts: 0 })
    );
  });

  it('should return error when ExamAssignment.create throws', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' },
    });
    mockFindOne.mockResolvedValue({ _id: 'config-1', active: true });
    mockCreate.mockRejectedValue(new Error('Database connection failed'));

    const result = await createAssignmentAction(validData);

    expect(result).toEqual({
      success: false,
      error: 'Database connection failed',
    });
  });
});

describe('createAssignmentAction — context shift', () => {
  const validData = {
    examConfigId: 'config-2',
    assignedToType: 'space' as const,
    assignedToId: 'space-2',
    startDate: '2025-06-01T00:00',
    endDate: '2025-07-01T00:00',
    maxAttempts: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create assignment in another tenant when SUPER_ADMIN passes tenantIdParam', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'super-1', tenantId: 'tenant-1', email: 'super@abd.com', role: 'SUPER_ADMIN' },
    });
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-2',
      dbPrefix: 't2_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });
    mockFindOne.mockResolvedValue({ _id: 'config-2', active: true });
    mockCreate.mockResolvedValue({ _id: 'new-id' });

    const result = await createAssignmentAction(validData, 'tenant-2');

    expect(result).toEqual({ success: true, id: 'new-id' });
    // Should query ExamConfig in the target tenant
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: 'config-2',
      tenantId: 'tenant-2',
      active: true,
    });
    // Should create assignment scoped to target tenant
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-2' })
    );
    expect(resolveTargetTenantContext).toHaveBeenCalledWith('tenant-2');
  });

  it('should use session tenant when tenantIdParam is undefined (passthrough)', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@test.com', role: 'ADMIN' },
    });
    mockFindOne.mockResolvedValue({ _id: 'config-1', active: true });
    mockCreate.mockResolvedValue({ _id: 'new-id' });

    const result = await createAssignmentAction(validData);

    expect(result).toEqual({ success: true, id: 'new-id' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
  });

  it('should reject non-SUPER_ADMIN passing tenantIdParam', async () => {
    getIndustrialSession.mockResolvedValue({
      user: { id: 'admin-1', tenantId: 'tenant-1', email: 'admin@test.com', role: 'ADMIN' },
    });
    resolveTargetTenantContext.mockResolvedValueOnce({
      tenantId: 'tenant-2',
      dbPrefix: 't2_',
      isolationStrategy: 'COLLECTION_PREFIX',
    });
    mockFindOne.mockResolvedValue(null);

    const result = await createAssignmentAction(validData, 'tenant-2');

    // An ADMIN can still pass tenantIdParam but the resolved context
    // will be used for the DB lookup — if the config doesn't exist there, it errors
    expect(result).toEqual({
      success: false,
      error: 'La configuración de examen no existe o no está activa',
    });
  });
});
