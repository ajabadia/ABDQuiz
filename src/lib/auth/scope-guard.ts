import QuizUserRole from '@/models/QuizUserRole';
import type { IQuizUserRole } from '@/models/QuizUserRole';

/**
 * Excepción lanzada cuando un usuario no posee el rol contextual requerido
 * dentro del ecosistema de aprendizaje (Quiz). Sigue el patrón de
 * InsufficientPrivilegesError del SDK satélite.
 */
export class QuizScopeDeniedError extends Error {
  constructor(message = 'ACCESO_DENEGADO: Rol contextual insuficiente en el ecosistema de aprendizaje') {
    super(message);
    this.name = 'QuizScopeDeniedError';
  }
}

/**
 * Resultado del check de autorización contextual.
 * Incluye el mapping encontrado (si existe) para que el caller
 * pueda inspeccionar el rol específico sin una query adicional.
 */
export interface QuizScopeResult {
  /** true si el usuario tiene el permiso requerido (o superior por jerarquía) */
  granted: boolean;
  /** El rol contextual encontrado en el mapping, o null si no existe mapping */
  roleType: IQuizUserRole['roleType'] | null;
}

/**
 * 🛡️ requireQuizScope
 * 
 * Evalúa si un usuario posee el rol contextual requerido dentro de un scope
 * (Space o Course) en el ecosistema de aprendizaje.
 * 
 * **Jerarquía de permisos:**
 *   - `CREATOR` y `PROFESSOR` tienen acceso total (bypass sobre cualquier requiredRole).
 *   - `AUDITOR` y `RECIPIENT` deben coincidir exactamente con requiredRole.
 * 
 * **Uso típico en Server Actions:**
 * ```ts
 * const { granted, roleType } = await requireQuizScope(
 *   user.id, user.tenantId, courseId, 'course', 'CREATOR'
 * );
 * if (!granted) throw new QuizScopeDeniedError();
 * ```
 * 
 * @param userId  - ID del usuario a verificar
 * @param tenantId - ID del tenant activo
 * @param scopeId  - ID del Space o Course sobre el que se evalúa el permiso
 * @param scopeType - Tipo de scope: 'space' | 'course'
 * @param requiredRole - Rol mínimo requerido: 'CREATOR' | 'PROFESSOR' | 'RECIPIENT' | 'AUDITOR'
 * @returns QuizScopeResult con { granted, roleType }
 */
export async function requireQuizScope(
  userId: string,
  tenantId: string,
  scopeId: string,
  scopeType: 'space' | 'course',
  requiredRole: 'CREATOR' | 'PROFESSOR' | 'RECIPIENT' | 'AUDITOR'
): Promise<QuizScopeResult> {
  const mapping = await QuizUserRole.findOne({
    userId,
    tenantId,
    scopeId,
    scopeType
  });

  if (!mapping) {
    return { granted: false, roleType: null };
  }

  // CREATOR y PROFESSOR tienen bypass total sobre cualquier requiredRole
  if (mapping.roleType === 'CREATOR' || mapping.roleType === 'PROFESSOR') {
    return { granted: true, roleType: mapping.roleType };
  }

  // Para AUDITOR y RECIPIENT: solo coincidencia exacta
  if (mapping.roleType === requiredRole) {
    return { granted: true, roleType: mapping.roleType };
  }

  return { granted: false, roleType: mapping.roleType };
}

/**
 * Versión estricta que lanza una excepción en lugar de devolver un objeto.
 * Ideal para usar en Server Actions donde se necesita cortocircuitar rápido.
 */
export async function assertQuizScope(
  userId: string,
  tenantId: string,
  scopeId: string,
  scopeType: 'space' | 'course',
  requiredRole: 'CREATOR' | 'PROFESSOR' | 'RECIPIENT' | 'AUDITOR'
): Promise<void> {
  const { granted } = await requireQuizScope(userId, tenantId, scopeId, scopeType, requiredRole);

  if (!granted) {
    throw new QuizScopeDeniedError(
      `El usuario no tiene el rol contextual '${requiredRole}' en el scope '${scopeType}:${scopeId}'`
    );
  }
}
