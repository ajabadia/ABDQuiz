'use server';

import { cookies } from 'next/headers';

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
  };
}

export async function getIndustrialSession(): Promise<FederatedSession> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('abd_session');
  
  if (!sessionCookie?.value) {
    return { authenticated: false };
  }

  try {
    const user = JSON.parse(sessionCookie.value);
    return { authenticated: true, user };
  } catch (error) {
    return { authenticated: false };
  }
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
