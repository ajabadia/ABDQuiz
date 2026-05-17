import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * 🛰️ ABDQuiz Proxy Guard
 * Standardized interceptor for Federated Identity in Next.js 16.
 * Decouples security logic from standard page loads.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip auth for assets, public landing pages, and internal APIs
  const isPublicPath = 
    pathname === '/' ||
    pathname === '/es' ||
    pathname === '/en' ||
    pathname === '/es/' ||
    pathname === '/en/' ||
    pathname.endsWith('/logout-success') ||
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico';

  if (isPublicPath) {
    return intlMiddleware(request);
  }

  // 2. Verification check against local federated cookie
  const sessionCookie = request.cookies.get('abd_session');
  const isAuthenticated = !!sessionCookie;

  // 3. Unauthorized redirect to central IdP (Federated Authorization Flow)
  if (!isAuthenticated) {
    const providerUrl = process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://abd-quiz.vercel.app';
    const clientId = process.env.AUTH_CLIENT_ID || 'abdquiz-industrial-client-id';

    const authorizeUrl = new URL(`${providerUrl}/api/auth/federated/authorize`, request.url);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', `${appUrl}/api/auth/federated/callback`);
    authorizeUrl.searchParams.set('state', pathname); 
    
    return NextResponse.redirect(authorizeUrl);
  }

  // 4. Pass through to intl middleware if authenticated
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.svg$).*)'],
};
