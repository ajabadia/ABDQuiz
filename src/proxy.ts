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
  let isAuthenticated = !!sessionCookie;
  let didVerifyThisRequest = false;

  // 🛡️ Session Expiry Desync Check: If authenticated but verified cookie is missing
  if (isAuthenticated && sessionCookie) {
    const verifiedCookie = request.cookies.get('abd_session_verified');
    
    if (!verifiedCookie) {
      try {
        const userProfile = JSON.parse(sessionCookie.value);
        const email = userProfile.email;
        
        if (email) {
          const providerUrl = process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app';
          const clientSecret = process.env.AUTH_CLIENT_SECRET || 'abdquiz-industrial-client-secret';
          
          const verifyUrl = new URL(`${providerUrl}/api/auth/session/verify`, request.url);
          verifyUrl.searchParams.set('email', email);
          
          const response = await fetch(verifyUrl.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${clientSecret}`,
              'Content-Type': 'application/json'
            },
            next: { revalidate: 0 } as any // Avoid Next.js fetch caching
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.active) {
              didVerifyThisRequest = true;
            } else {
              isAuthenticated = false; // Account deactivated or locked!
            }
          }
        }
      } catch (err) {
        console.error('[PROXY_SESSION_VERIFICATION_ERROR]', err);
      }
    }
  }

  // 3. Unauthorized redirect to central IdP (Federated Authorization Flow)
  if (!isAuthenticated) {
    const providerUrl = process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://abd-quiz.vercel.app';
    const clientId = process.env.AUTH_CLIENT_ID || 'abdquiz-industrial-client-id';

    const authorizeUrl = new URL(`${providerUrl}/api/auth/federated/authorize`, request.url);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', `${appUrl}/api/auth/federated/callback`);
    authorizeUrl.searchParams.set('state', pathname); 
    
    const response = NextResponse.redirect(authorizeUrl);
    
    // 🧹 Purge session cookies to prevent loops
    response.cookies.set('abd_session', '', { path: '/', maxAge: 0, expires: new Date(0) });
    response.cookies.set('abd_session_verified', '', { path: '/', maxAge: 0, expires: new Date(0) });
    
    return response;
  }

  // 4. Pass through to intl middleware if authenticated
  const response = await intlMiddleware(request);

  // If verified successfully on this request, set the verified immunity cookie for 60 seconds
  if (didVerifyThisRequest) {
    response.cookies.set('abd_session_verified', '1', {
      path: '/',
      maxAge: 60, // 60 seconds of network immunity
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.svg$).*)'],
};

