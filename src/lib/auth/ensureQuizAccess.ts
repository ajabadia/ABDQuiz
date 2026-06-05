import { ensureIndustrialAccess, InsufficientPrivilegesError } from '@ajabadia/satellite-sdk';
import { assertAccess } from './abac';

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
 * que tengan rol contextual autorizado en el scope indicado
 * también serán autorizados mediante el motor central ABAC.
 *
 * @param scopeConfig - Configuración opcional de scope para fallback USER
 * @returns The authenticated user's profile
 * @throws UnauthorizedAccessError if not authenticated
 * @throws InsufficientPrivilegesError if role is not ADMIN/PROFESSOR/SUPER_ADMIN or denied by ABAC
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
    try {
      await assertAccess({
        userId: user.id,
        tenantId: scopeConfig.tenantId,
        resource: 'quiz:exam',
        action: 'take',
        context: {
          scopeId: scopeConfig.scopeId,
          scopeType: scopeConfig.scopeType ?? 'course'
        }
      });
      return user;
    } catch {
      throw new InsufficientPrivilegesError();
    }
  }

  throw new InsufficientPrivilegesError();
}

