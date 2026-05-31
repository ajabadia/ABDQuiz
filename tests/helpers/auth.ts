import { SignJWT } from 'jose';
import type { Page } from '@playwright/test';

/**
 * 🔐 Shared auth helper for ABDQuiz Playwright tests.
 *
 * Signs a proper JWT with the real AUTH_JWT_SECRET and injects:
 * - `abd_session` — the signed JWT
 * - `abd_session_verified=1` — bypasses verifySessionExpiry call to ABDAuth
 *
 * This avoids requiring a full SSO redirect flow or a running ABDAuth server.
 */
const JWT_SECRET: string =
  process.env.AUTH_JWT_SECRET ||
  'abd-auth-industrial-fallback-secret-2026'; // fallback del .env.local

export const ADMIN_USER = {
  sub: '661a1b2c3d4e5f6a7b8c9d0e',
  email: 'ajabadia@gmail.com',
  name: 'AJ',
  surname: 'Abadia',
  role: 'SUPER_ADMIN',
  tenantId: 'banco-parque',
  permissions: ['read', 'write', 'admin'],
  dbPrefix: 'bancoparque',
  isolationStrategy: 'COLLECTION_PREFIX' as const,
  allowedApps: ['abdquiz', 'quiz'],
};

export async function injectAdminSession(page: Page): Promise<void> {
  const secretKey = new TextEncoder().encode(JWT_SECRET);

  const token = await new SignJWT({
    sub: ADMIN_USER.sub,
    email: ADMIN_USER.email,
    name: ADMIN_USER.name,
    surname: ADMIN_USER.surname,
    role: ADMIN_USER.role,
    tenantId: ADMIN_USER.tenantId,
    permissions: ADMIN_USER.permissions,
    dbPrefix: ADMIN_USER.dbPrefix,
    isolationStrategy: ADMIN_USER.isolationStrategy,
    allowedApps: ADMIN_USER.allowedApps,
    sessionId: 'e2e-test-session',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey);

  await page.context().addCookies([
    {
      name: 'abd_session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    },
    {
      name: 'abd_session_verified',
      value: '1',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
      expires: Math.floor(Date.now() / 1000) + 120, // 2 min
    },
  ]);
}
