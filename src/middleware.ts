import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * 🛰️ ABDQuiz Middleware Guard
 * Standardized interceptor for Federated Identity.
 * Decouples security logic from standard page loads.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip auth for assets and internal APIs
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico'
  ) {
    return intlMiddleware(request);
  }

  // 2. Verification check against local federated cookie
  const sessionCookie = request.cookies.get('abd_session');
  const isAuthenticated = !!sessionCookie;

  // 3. Unauthorized redirect to central IdP (Federated Authorization Flow)
  if (!isAuthenticated) {
    const authorizeUrl = new URL(`${process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app'}/api/auth/federated/authorize`, request.url);
    authorizeUrl.searchParams.set('client_id', process.env.AUTH_CLIENT_ID || '');
    authorizeUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/federated/callback`);
    authorizeUrl.searchParams.set('state', pathname); 
    
    return NextResponse.redirect(authorizeUrl);
  }

  // 4. Pass through to intl middleware if authenticated
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.svg$).*)'],
};
