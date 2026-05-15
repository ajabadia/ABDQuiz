/**
 * 🛰️ ABD Ecosystem Identity Bridge
 * Standardized client for verifying sessions against the central ABDAuth provider.
 */

export interface FederatedSession {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
  expires?: string;
}

export async function getFederatedSession(cookieString: string): Promise<FederatedSession> {
  const verifyUrl = process.env.AUTH_VERIFY_URL || 'http://localhost:3400/api/auth/session';

  try {
    const response = await fetch(verifyUrl, {
      headers: {
        // 🛡️ Forwarding the cookies to the identity provider
        'Cookie': cookieString,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { authenticated: false };
    }

    return await response.json();
  } catch (error) {
    console.error('[IDENTITY_BRIDGE_FAILURE]', error);
    return { authenticated: false };
  }
}
