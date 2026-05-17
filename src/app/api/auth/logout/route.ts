import { NextResponse } from 'next/server';

/**
 * 🚿 Secure Logout Handler
 * Clears the local session cookie and redirects to the central Identity Provider's logout endpoint.
 */
export async function GET() {
  const providerLogoutUrl = `${process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app'}/api/auth/logout`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300';
  const redirectUri = `${appUrl}/logout-success`;
  
  const response = NextResponse.redirect(
    new URL(`${providerLogoutUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`)
  );
  
  // 🧹 Wipe the local session cookie
  response.cookies.set('abd_session', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  });

  // 🛡️ Volumetric Anti-Caching Headers (SOC2 Standards)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}
