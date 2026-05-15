import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { getFederatedSession } from './lib/auth-bridge';

const intlMiddleware = createMiddleware(routing);

/**
 * 🛰️ Ecosystem Identity Proxy Middleware
 * Orchestrates i18n and Global SSO Session verification.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip auth for assets and public routes
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico'
  ) {
    return intlMiddleware(request);
  }

  // 2. Verification check against ABDAuth
  const cookieString = request.headers.get('cookie') || '';
  const session = await getFederatedSession(cookieString);

  // 3. Unauthorized redirect to central IdP
  if (!session.authenticated) {
    const loginUrl = new URL(`${process.env.AUTH_PROVIDER_URL}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Pass through to intl middleware if authenticated
  return intlMiddleware(request);
}

export const config = {
  // Catch all routes for global protection
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
