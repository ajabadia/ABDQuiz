import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InsufficientPrivilegesError as InsufficientPrivilegesErrorType } from '@ajabadia/satellite-sdk';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@ajabadia/satellite-sdk', () => {
  class MockInsufficientPrivilegesError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'Acceso denegado');
      this.name = 'InsufficientPrivilegesError';
    }
  }

  return {
    ensureIndustrialAccess: vi.fn(),
    InsufficientPrivilegesError: MockInsufficientPrivilegesError,
  };
});

vi.mock('@/lib/auth/abac', () => ({
  assertAccess: vi.fn(),
}));

// ── Import deps under test ────────────────────────────

import { ensureIndustrialAccess, InsufficientPrivilegesError } from '@ajabadia/satellite-sdk';
import { assertAccess } from '@/lib/auth/abac';
import { ensureAdminOrProfessor } from './ensureQuizAccess';

// ── Typed mock refs ───────────────────────────────────

const mockEnsureIndustrialAccess = ensureIndustrialAccess as ReturnType<typeof vi.fn>;
const mockAssertAccess = assertAccess as ReturnType<typeof vi.fn>;

import {
  ADMIN_USER, PROFESSOR_USER, SUPER_ADMIN_USER,
  USER_USER, AUDITOR_USER, OPERATOR_USER,
} from './ensureQuizAccess.test.fixtures';

const InsufficientPrivilegesErrorClass = InsufficientPrivilegesError as unknown as new (msg?: string) => Error;

// ── Tests ─────────────────────────────────────────────

describe('ensureAdminOrProfessor — Autorización por rol de sistema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── System role: success cases ─────────────────────

  it('debe autorizar a ADMIN (rol de sistema)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(ADMIN_USER);

    const result = await ensureAdminOrProfessor();

    expect(result).toEqual(ADMIN_USER);
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });

  it('debe autorizar a PROFESSOR (rol de sistema)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(PROFESSOR_USER);

    const result = await ensureAdminOrProfessor();

    expect(result).toEqual(PROFESSOR_USER);
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });

  it('debe autorizar a SUPER_ADMIN (bypass total)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(SUPER_ADMIN_USER);

    const result = await ensureAdminOrProfessor();

    expect(result).toEqual(SUPER_ADMIN_USER);
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });

  // ── System role: failure cases ─────────────────────

  it('debe denegar a USER (sin scope config)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);

    await expect(ensureAdminOrProfessor()).rejects.toThrow(InsufficientPrivilegesErrorClass);
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });

  it('debe denegar a AUDITOR', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(AUDITOR_USER);

    await expect(ensureAdminOrProfessor()).rejects.toThrow(InsufficientPrivilegesErrorClass);
  });

  it('debe denegar a OPERATOR', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(OPERATOR_USER);

    await expect(ensureAdminOrProfessor()).rejects.toThrow(InsufficientPrivilegesErrorClass);
  });

  it('debe propagar error de autenticación si ensureIndustrialAccess falla', async () => {
    mockEnsureIndustrialAccess.mockRejectedValue(new Error('Not authenticated'));

    await expect(ensureAdminOrProfessor()).rejects.toThrow('Not authenticated');
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });
});

describe('ensureAdminOrProfessor — Scope fallback (USER + ABAC central check)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── USER + ABAC Central check: success ────────────────

  it('debe autorizar a USER si ABAC permite el acceso', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockAssertAccess.mockResolvedValue(undefined); // allowed

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
      scopeType: 'course',
    });

    expect(result).toEqual(USER_USER);
    expect(mockAssertAccess).toHaveBeenCalledWith({
      userId: 'user-1',
      tenantId: 't1',
      resource: 'quiz:exam',
      action: 'take',
      context: {
        scopeId: 'course-abc',
        scopeType: 'course',
      },
    });
  });

  it('debe usar scopeType "course" por defecto si no se especifica', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockAssertAccess.mockResolvedValue(undefined);

    await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-def',
    });

    expect(mockAssertAccess).toHaveBeenCalledWith({
      userId: 'user-1',
      tenantId: 't1',
      resource: 'quiz:exam',
      action: 'take',
      context: {
        scopeId: 'course-def',
        scopeType: 'course',
      },
    });
  });

  // ── USER + ABAC Central check: failure ────────────────

  it('debe denegar a USER si ABAC deniega el acceso (throws error)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockAssertAccess.mockRejectedValue(new InsufficientPrivilegesErrorClass('ABAC Denied'));

    await expect(ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    })).rejects.toThrow(InsufficientPrivilegesErrorClass);

    expect(mockAssertAccess).toHaveBeenCalled();
  });

  // ── Super ADMIN bypass incluso con scopeConfig ─────

  it('debe autorizar a SUPER_ADMIN aunque se pase scopeConfig (bypass)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(SUPER_ADMIN_USER);

    const result = await ensureAdminOrProfessor({
      tenantId: 't2',
      scopeId: 'course-cross',
    });

    expect(result).toEqual(SUPER_ADMIN_USER);
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });

  // ── ADMIN/PROFESSOR no deben pasar por scope check ─

  it('debe autorizar a ADMIN directamente aunque se pase scopeConfig', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(ADMIN_USER);

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    });

    expect(result).toEqual(ADMIN_USER);
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });

  it('debe autorizar a PROFESSOR directamente aunque se pase scopeConfig', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(PROFESSOR_USER);

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    });

    expect(result).toEqual(PROFESSOR_USER);
    expect(mockAssertAccess).not.toHaveBeenCalled();
  });
});
