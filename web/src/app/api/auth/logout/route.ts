import { NextResponse } from 'next/server';

/**
 * 🚿 Secure Logout Handler
 * Clears the industrial session cookie and redirects to the identity provider.
 */
export async function GET() {
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3300'));
  
  // 🧹 Wipe the session cookie
  response.cookies.set('abd_session', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
  });

  return response;
}
