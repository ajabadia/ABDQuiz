/**
 * @purpose Gestiona solicitudes GET para recuperar una lista de inquilinos, asegurando el acceso solo para usuarios SUPER_ADMIN.
 * @purpose_en Handles GET requests to retrieve a list of tenants, ensuring access for only SUPER_ADMIN users.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:2,imports:4,sig:17kxdd6
 * @lastUpdated 2026-06-23T16:47:41.756Z
 */

import { NextResponse } from 'next/server';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';
import { getGlobalModel } from '@ajabadia/satellite-sdk';
import mongoose from 'mongoose';

export const revalidate = 0; // Evitar el cacheado estático de la API

const TenantSchema = new mongoose.Schema({ tenantId: String, name: String, active: Boolean }, { collection: 'tenants' });
const TenantModel = getGlobalModel('Tenant', TenantSchema, 'AUTH');

export async function GET() {
  try {
    // 🛡️ Verificar acceso con rol mínimo ADMIN
    const user = await ensureAdminOrProfessor();
    
    // Solo SUPER_ADMIN puede ver todos los tenants
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawTenants = await TenantModel.find().lean();
    const tenants = (rawTenants as unknown as { tenantId: string; name?: string; active?: boolean }[]).map((t) => ({
      tenantId: t.tenantId,
      name: t.name || t.tenantId,
      active: t.active !== false,
    }));

    return NextResponse.json(tenants);
  } catch (error: unknown) {
    console.error('[API_GET_TENANTS_ERROR]', error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
