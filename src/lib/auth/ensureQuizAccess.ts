import { ensureIndustrialAccess, InsufficientPrivilegesError } from '@abd/satellite-sdk';

/**
 * Roles that have administrative privileges in the Quiz ecosystem.
 * PROFESSOR inherits ADMIN-level access for all Quiz operations.
 */
const ADMIN_LEVEL_ROLES = new Set(['ADMIN', 'PROFESSOR']);

/**
 * 🛡️ Ensure the user has ADMIN, PROFESSOR, or SUPER_ADMIN privileges.
 *
 * This is a local wrapper around `ensureIndustrialAccess` that extends
 * the role check to include PROFESSOR (which inherits ADMIN privileges
 * in the Quiz ecosystem).
 *
 * @returns The authenticated user's profile
 * @throws UnauthorizedAccessError if not authenticated
 * @throws InsufficientPrivilegesError if role is not ADMIN/PROFESSOR/SUPER_ADMIN
 */
export async function ensureAdminOrProfessor() {
  // First check basic authentication (no role filter)
  const user = await ensureIndustrialAccess();

  // Then check for admin-level role (ADMIN, PROFESSOR, or SUPER_ADMIN bypass)
  if (!ADMIN_LEVEL_ROLES.has(user.role) && user.role !== 'SUPER_ADMIN') {
    throw new InsufficientPrivilegesError();
  }

  return user;
}
