import { createAuthRouteHandler } from '@ajabadia/satellite-sdk';
import { NextRequest } from 'next/server';

const handler = createAuthRouteHandler({
  appId: 'quiz',
  clientId: process.env.AUTH_CLIENT_ID!,
  clientSecret: process.env.AUTH_CLIENT_SECRET!,
  jwtSecret: process.env.AUTH_JWT_SECRET!,
});

export async function GET(request: NextRequest, context: { params: Promise<{ auth: string[] }> }) {
  return handler(request as unknown as Parameters<typeof handler>[0]);
}

export async function POST(request: NextRequest, context: { params: Promise<{ auth: string[] }> }) {
  return handler(request as unknown as Parameters<typeof handler>[0]);
}
