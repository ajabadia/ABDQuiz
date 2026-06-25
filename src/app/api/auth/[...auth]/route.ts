/**
 * @purpose Gestiona solicitudes de autenticación para la aplicación ABDQuiz utilizando el SDK de Satellite.
 * @purpose_en Handles authentication requests for the ABDQuiz application using the Satellite SDK.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:1v4vm3j
 * @lastUpdated 2026-06-23T16:47:46.819Z
 */

import { createAuthRouteHandler } from '@ajabadia/satellite-sdk/auth-middleware';
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
