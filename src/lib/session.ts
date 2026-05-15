import { headers } from 'next/headers';
import { getFederatedSession, FederatedSession } from './auth-bridge';

/**
 * 🏢 Industrial Session Helper (Server Side)
 * Retrieves the federated identity context from the ABDAuth provider.
 * Usage: const session = await getIndustrialSession();
 */
export async function getIndustrialSession(): Promise<FederatedSession> {
  const headerList = await headers();
  const cookieString = headerList.get('cookie') || '';
  
  // Call the internal identity bridge
  return await getFederatedSession(cookieString);
}

/**
 * 🛡️ Assertion Helper
 * Throws if the user is not authenticated or doesn't have the required role.
 */
export async function ensureIndustrialAccess(requiredRole?: string) {
  const session = await getIndustrialSession();
  
  if (!session.authenticated || !session.user) {
    throw new Error('UNAUTHORIZED_ECOSYSTEM_ACCESS');
  }

  if (requiredRole && session.user.role !== requiredRole && session.user.role !== 'SUPER_ADMIN') {
    throw new Error('INSUFFICIENT_INDUSTRIAL_PRIVILEGES');
  }

  return session.user;
}
