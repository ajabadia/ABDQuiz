/**
 * @purpose Proporciona notificaciones emergentes para solicitudes GET para recuperar espacios activos del usuario autenticado.
 * @purpose_en Handles GET requests to retrieve active spaces for the authenticated user.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1wxohh8
 * @lastUpdated 2026-06-25T09:18:41.644Z
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpaceServiceClient } from '@/services/space-client';
import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';

export async function GET(req: NextRequest) {
  const session = await getIndustrialSession();
  if (!session.authenticated || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const spaces = await SpaceServiceClient.getActiveSpaces(session.user.tenantId);
  return NextResponse.json(spaces);
}
