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

vi.mock('@/lib/auth/scope-guard', () => ({
  requireQuizScope: vi.fn(),
}));

// ── Import deps under test ────────────────────────────

import { ensureIndustrialAccess, InsufficientPrivilegesError } from '@ajabadia/satellite-sdk';
import { requireQuizScope } from '@/lib/auth/scope-guard';
import { ensureAdminOrProfessor } from './ensureQuizAccess';

// ── Typed mock refs ───────────────────────────────────

const mockEnsureIndustrialAccess = ensureIndustrialAccess as ReturnType<typeof vi.fn>;
const mockRequireQuizScope = requireQuizScope as ReturnType<typeof vi.fn>;

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
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
  });

  it('debe autorizar a PROFESSOR (rol de sistema)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(PROFESSOR_USER);

    const result = await ensureAdminOrProfessor();

    expect(result).toEqual(PROFESSOR_USER);
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
  });

  it('debe autorizar a SUPER_ADMIN (bypass total)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(SUPER_ADMIN_USER);

    const result = await ensureAdminOrProfessor();

    expect(result).toEqual(SUPER_ADMIN_USER);
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
  });

  // ── System role: failure cases ─────────────────────

  it('debe denegar a USER (sin scope config)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);

    await expect(ensureAdminOrProfessor()).rejects.toThrow(InsufficientPrivilegesErrorClass);
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
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
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
  });
});

describe('ensureAdminOrProfessor — Scope fallback (USER + PROFESSOR scope)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── USER + PROFESSOR scope: success ────────────────

  it('debe autorizar a USER con scope PROFESSOR en un course', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: true, roleType: 'PROFESSOR' });

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
      scopeType: 'course',
    });

    expect(result).toEqual(USER_USER);
    expect(mockRequireQuizScope).toHaveBeenCalledWith(
      'user-1', 't1', 'course-abc', 'course', 'PROFESSOR'
    );
  });

  it('debe autorizar a USER con scope PROFESSOR en un space', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: true, roleType: 'PROFESSOR' });

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'space-xyz',
      scopeType: 'space',
    });

    expect(result).toEqual(USER_USER);
    expect(mockRequireQuizScope).toHaveBeenCalledWith(
      'user-1', 't1', 'space-xyz', 'space', 'PROFESSOR'
    );
  });

  it('debe usar scopeType "course" por defecto si no se especifica', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: true, roleType: 'PROFESSOR' });

    await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-def',
    });

    expect(mockRequireQuizScope).toHaveBeenCalledWith(
      'user-1', 't1', 'course-def', 'course', 'PROFESSOR'
    );
  });

  it('debe autorizar a USER con scope CREATOR (bypass jerárquico superior)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: true, roleType: 'CREATOR' });

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-admin',
    });

    expect(result).toEqual(USER_USER);
  });

  // ── USER + PROFESSOR scope: failure ────────────────

  it('debe denegar a USER con scope RECIPIENT (rol contextual insuficiente)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: false, roleType: 'RECIPIENT' });

    await expect(ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    })).rejects.toThrow(InsufficientPrivilegesErrorClass);

    expect(mockRequireQuizScope).toHaveBeenCalled();
  });

  it('debe denegar a USER sin mapping de scope (no existe QuizUserRole)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: false, roleType: null });

    await expect(ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    })).rejects.toThrow(InsufficientPrivilegesErrorClass);
  });

  it('debe denegar a USER con scope AUDITOR (rol inferior al requerido)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: false, roleType: 'AUDITOR' });

    await expect(ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    })).rejects.toThrow(InsufficientPrivilegesErrorClass);
  });

  // ── Super ADMIN bypass incluso con scopeConfig ─────

  it('debe autorizar a SUPER_ADMIN aunque se pase scopeConfig (bypass)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(SUPER_ADMIN_USER);

    const result = await ensureAdminOrProfessor({
      tenantId: 't2',
      scopeId: 'course-cross',
    });

    expect(result).toEqual(SUPER_ADMIN_USER);
    // No debe llamar a requireQuizScope porque SUPER_ADMIN bypassa todo
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
  });

  // ── ADMIN/PROFESSOR no deben pasar por scope check ─

  it('debe autorizar a ADMIN directamente aunque se pase scopeConfig', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(ADMIN_USER);

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    });

    expect(result).toEqual(ADMIN_USER);
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
  });

  it('debe autorizar a PROFESSOR directamente aunque se pase scopeConfig', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(PROFESSOR_USER);

    const result = await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-abc',
    });

    expect(result).toEqual(PROFESSOR_USER);
    expect(mockRequireQuizScope).not.toHaveBeenCalled();
  });

  // ── Edge cases ─────────────────────────────────────

  it('debe denegar a USER si scopeConfig es inválido (tenantId/scopeId undefined)', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: false, roleType: null });

    // Pasar objeto vacío → scopeConfig es truthy pero tenantId/scopeId son undefined
    // requireQuizScope se llama con undefined, retorna granted:false, y se lanza InsufficientPrivilegesError
    await expect(ensureAdminOrProfessor({} as any)).rejects.toThrow(InsufficientPrivilegesErrorClass);
  });

  it('debe pasar el tenantId correcto al scope check', async () => {
    mockEnsureIndustrialAccess.mockResolvedValue(USER_USER);
    mockRequireQuizScope.mockResolvedValue({ granted: true, roleType: 'PROFESSOR' });

    await ensureAdminOrProfessor({
      tenantId: 'custom-tenant-id',
      scopeId: 'course-1',
    });

    expect(mockRequireQuizScope).toHaveBeenCalledWith(
      'user-1', 'custom-tenant-id', 'course-1', 'course', 'PROFESSOR'
    );
  });

  it('debe usar el id del usuario para el scope check', async () => {
    const customUser = { id: 'custom-id-123', tenantId: 't1', role: 'USER' };
    mockEnsureIndustrialAccess.mockResolvedValue(customUser);
    mockRequireQuizScope.mockResolvedValue({ granted: true, roleType: 'PROFESSOR' });

    await ensureAdminOrProfessor({
      tenantId: 't1',
      scopeId: 'course-1',
    });

    expect(mockRequireQuizScope).toHaveBeenCalledWith(
      'custom-id-123', 't1', 'course-1', 'course', 'PROFESSOR'
    );
  });
});
