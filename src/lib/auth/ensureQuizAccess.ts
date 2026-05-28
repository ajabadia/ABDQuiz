import { ensureIndustrialAccess, InsufficientPrivilegesError } from '@ajabadia/satellite-sdk';
import { requireQuizScope } from './scope-guard';

/**
 * Roles that have administrative privileges in the Quiz ecosystem.
 * PROFESSOR inherits ADMIN-level access for all Quiz operations.
 */
const ADMIN_LEVEL_ROLES = new Set(['ADMIN', 'PROFESSOR']);

/**
 * Configuración opcional para verificar rol contextual (scope) como fallback
 * cuando el usuario tiene rol de sistema `USER`.
 */
export interface ScopeFallbackConfig {
  /** ID del tenant al que pertenece el scope */
  tenantId: string;
  /** ID del scope (Course o Space) */
  scopeId: string;
  /** Tipo de scope: 'course' (por defecto) o 'space' */
  scopeType?: 'space' | 'course';
}

/**
 * 🛡️ Ensure the user has ADMIN, PROFESSOR, or SUPER_ADMIN privileges.
 *
 * Si se proporciona `scopeConfig`, los usuarios con rol de sistema `USER`
 * que tengan rol contextual `PROFESSOR` (o `CREATOR`) en el scope indicado
 * también serán autorizados.
 *
 * This is a local wrapper around `ensureIndustrialAccess` that extends
 * the role check to include PROFESSOR (which inherits ADMIN privileges
 * in the Quiz ecosystem).
 *
 * @param scopeConfig - Configuración opcional de scope para fallback USER + PROFESSOR
 * @returns The authenticated user's profile
 * @throws UnauthorizedAccessError if not authenticated
 * @throws InsufficientPrivilegesError if role is not ADMIN/PROFESSOR/SUPER_ADMIN
 */
export async function ensureAdminOrProfessor(scopeConfig?: ScopeFallbackConfig) {
  // First check basic authentication (no role filter)
  const user = await ensureIndustrialAccess();

  // SUPER_ADMIN bypasses everything
  if (user.role === 'SUPER_ADMIN') return user;

  // ADMIN or PROFESSOR system role → allowed directly
  if (ADMIN_LEVEL_ROLES.has(user.role)) return user;

  // USER system role → check scope fallback if scopeConfig is provided
  if (user.role === 'USER' && scopeConfig) {
    const { granted } = await requireQuizScope(
      user.id,
      scopeConfig.tenantId,
      scopeConfig.scopeId,
      scopeConfig.scopeType ?? 'course',
      'PROFESSOR'
    );
    if (granted) return user;
  }

  throw new InsufficientPrivilegesError();
}
