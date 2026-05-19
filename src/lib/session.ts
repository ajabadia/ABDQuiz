'use server';

import { cookies } from 'next/headers';
import { verifyToken } from './token-verifier';

export interface FederatedSession {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    surname: string;
    role: string;
    tenantId: string;
    dbPrefix: string;
    isolationStrategy: string;
    permissions: string[];
    allowedApps?: string[];
  };
}

export async function getIndustrialSession(): Promise<FederatedSession> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('abd_session');
  
  if (!sessionCookie?.value) {
    return { authenticated: false };
  }

  const payload = await verifyToken(sessionCookie.value);
  if (!payload) {
    // Signature invalid, token expired, or tampered cookie
    console.warn('[SESSION_CRYPTO_VERIFICATION_FAILED]');
    return { authenticated: false };
  }

  // Check allowedApps licensing
  const isSuperAdmin = payload.role === 'SUPER_ADMIN';
  const isAppAllowed = isSuperAdmin || (payload.allowedApps && payload.allowedApps.includes('quiz'));

  if (!isAppAllowed) {
    console.warn('[SESSION_APP_NOT_ALLOWED]');
    return { authenticated: false };
  }

  return {
    authenticated: true,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      surname: payload.surname,
      role: payload.role,
      tenantId: payload.tenantId,
      dbPrefix: payload.dbPrefix,
      isolationStrategy: payload.isolationStrategy,
      permissions: payload.permissions || [],
      allowedApps: payload.allowedApps,
    }
  };
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
