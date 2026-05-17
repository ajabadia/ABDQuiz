import { NextRequest, NextResponse } from 'next/server';

/**
 * 🛰️ Federated Callback Handler (ABDQuiz)
 * Receives the authorization code from ABDAuth and exchanges it for a user profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '/';

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  try {
    // 1. Exchange code for token & profile
    const tokenUrl = process.env.AUTH_VERIFY_URL || 'https://abd-auth.vercel.app/api/auth/federated/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.AUTH_CLIENT_ID,
        client_secret: process.env.AUTH_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/federated/callback`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Token exchange failed', detail: errorData }, { status: 401 });
    }

    const data = await response.json();

    // 2. Create the local session (Cookie)
    // For now, we store the full industrial profile in a secure cookie
    const nextResponse = NextResponse.redirect(new URL(state, request.url));
    
    nextResponse.cookies.set('abd_session', JSON.stringify(data.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours industrial shift
    });

    return nextResponse;
  } catch (error) {
    console.error('[FEDERATED_CALLBACK_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
