import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { verifyToken } from './lib/token-verifier';

const intlMiddleware = createMiddleware(routing);

interface TenantBrandingTheme {
  primary: string;
  secondary?: string;
  background?: string;
  rounded?: boolean;
  radius?: string;
}

interface TenantInfo {
  active: boolean;
  tenantId: string;
  name: string;
  dbPrefix: string;
  isolationStrategy: string;
  branding: {
    logoUrl?: string | null;
    theme?: TenantBrandingTheme;
  } | null;
}


/**
 * 🏢 Helper to extract tenant subdomain from host header
 */
function getTenantSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  
  if (parts.length > 2) {
    const subdomain = parts[0];
    if (subdomain === 'www') return null;
    return subdomain;
  }
  
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  
  return null;
}

/**
 * 🛰️ ABDQuiz Proxy Guard
 * Standardized interceptor for Federated Identity in Next.js 16.
 * Decouples security logic from standard page loads, supporting subdomain isolation.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip auth for static assets, internal Next.js routes and APIs
  const isAsset = 
    pathname.includes('.') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico';

  if (isAsset) {
    return intlMiddleware(request);
  }

  // 2. Extract and Validate Subdomain Tenant Metadata
  const host = request.headers.get('host');
  const subdomain = getTenantSubdomain(host);
  let tenantInfo: TenantInfo | null = null;

  if (subdomain) {
    try {
      const providerUrl = process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app';
      const verifyTenantUrl = `${providerUrl}/api/auth/tenant/info?subdomain=${subdomain}`;
      const res = await fetch(verifyTenantUrl, { 
        next: { revalidate: 60 } 
      } as RequestInit & { next?: { revalidate: number } });
      if (res.ok) {
        tenantInfo = await res.json() as TenantInfo;
      }
    } catch (err) {
      console.error('[PROXY_TENANT_VERIFICATION_ERROR]', err);
    }

    // Block access if subdomain is active but tenant is not found or inactive in central IdP
    if (!tenantInfo || !tenantInfo.active) {
      const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300';
      return NextResponse.redirect(new URL(`${baseAppUrl}/logout-success?error=tenant_not_found`));
    }
  }

  // 3. Skip auth for public landing pages and logout page
  const isPublicPath = 
    pathname === '/' ||
    pathname === '/es' ||
    pathname === '/en' ||
    pathname === '/es/' ||
    pathname === '/en/' ||
    pathname.endsWith('/logout-success');

  // 4. Session Validation via cryptographic JWT verification
  const sessionCookie = request.cookies.get('abd_session');
  let isAuthenticated = false;
  let didVerifyThisRequest = false;
  let userProfile: { email: string; tenantId: string } | null = null;
  let isAppNotAllowed = false;

  if (sessionCookie?.value) {
    const payload = await verifyToken(sessionCookie.value);
    if (payload) {
      // Check if user is SUPER_ADMIN or has access to 'quiz'
      const isSuperAdmin = payload.role === 'SUPER_ADMIN';
      const isAppAllowed = isSuperAdmin || (payload.allowedApps && payload.allowedApps.includes('quiz'));

      if (isAppAllowed) {
        isAuthenticated = true;
        userProfile = {
          email: payload.email,
          tenantId: payload.tenantId,
        };
      } else {
        isAppNotAllowed = true;
      }
    }
  }

  // 🛡️ Cross-Tenant Security Check: Force re-auth if session tenant doesn't match active subdomain tenant
  if (isAuthenticated && userProfile && tenantInfo) {
    if (userProfile.tenantId !== tenantInfo.tenantId) {
      isAuthenticated = false; // Purge cross-tenant session pollution
    }
  }

  // 🛡️ Session Expiry Desync Check: If authenticated but verified cookie is missing
  if (isAuthenticated && sessionCookie && userProfile) {
    const verifiedCookie = request.cookies.get('abd_session_verified');
    
    if (!verifiedCookie) {
      try {
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
            next: { revalidate: 0 }
          } as RequestInit & { next?: { revalidate: number } });
          
          if (response.ok) {
            const data = await response.json() as { active: boolean };
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

  // 5. Bypass authentication check for public paths if the tenant validation is successful
  if (isPublicPath && !isAuthenticated) {
    return intlMiddleware(request);
  }

  // 6. Unauthorized redirect to central IdP (Federated Authorization Flow)
  if (!isAuthenticated) {
    const providerUrl = process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app';
    const currentUrl = new URL(request.url);
    const dynamicAppUrl = `${currentUrl.protocol}//${currentUrl.host}`;
    const clientId = process.env.AUTH_CLIENT_ID || 'abdquiz-industrial-client-id';

    const authorizeUrl = new URL(`${providerUrl}/api/auth/federated/authorize`, request.url);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', `${dynamicAppUrl}/api/auth/federated/callback`);
    authorizeUrl.searchParams.set('state', pathname); 
    
    if (tenantInfo) {
      authorizeUrl.searchParams.set('tenant', tenantInfo.tenantId);
    }

    if (isAppNotAllowed) {
      authorizeUrl.searchParams.set('error', 'app_not_allowed');
    }
    
    const response = NextResponse.redirect(authorizeUrl);
    
    // 🧹 Purge session cookies to prevent loops
    response.cookies.set('abd_session', '', { path: '/', maxAge: 0, expires: new Date(0) });
    response.cookies.set('abd_session_verified', '', { path: '/', maxAge: 0, expires: new Date(0) });
    
    return response;
  }

  // 7. Pass through to intl middleware if authenticated
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
