/**
 * @purpose Gestiona el proceso de eliminación de datos para usuarios y tenantes en conformidad con la GDPR, actualizando los datos del usuario y eliminando colecciones o bases de datos.
 * @purpose_en Handles the purge operation for tenants and users in compliance with GDPR, including updating user data and dropping collections or databases.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:juq55u
 * @lastUpdated 2026-06-25T09:18:50.868Z
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getTenantConnection } from '@ajabadia/satellite-sdk/db';
import { z } from 'zod';

const TenantPurgeSchema = z.object({
  tenantId: z.string().min(1),
  dbPrefix: z.string().min(1),
  isolationStrategy: z.enum(['COLLECTION_PREFIX', 'DATABASE_PER_TENANT']),
});

const UserPurgeSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  email: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (!secret || secret !== process.env.ABD_INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.json();

    // Per-user GDPR purge (right to be forgotten)
    if (raw.userId) {
      const body = UserPurgeSchema.parse(raw);
      await connectDB();
      const conn = getTenantConnection(body.tenantId, 'COLLECTION_PREFIX');

      const models = ['ExamAttempt', 'ExamIncident', 'Allegation', 'Certificate', 'ExamAssignment', 'UserCourseSummary', 'UserLeitnerState', 'CorpusImport', 'QuizUserRole'];
      const summary: Record<string, number> = {};

      for (const name of models) {
        const model = conn.models[name];
        if (model) {
          const result = await model.updateMany(
            { tenantId: body.tenantId, userId: body.userId },
            { $set: { userId: '[GDPR_ERASED]' } }
          );
          summary[name] = result.modifiedCount;
        }
      }

      // Also handle incidents that store studentId
      const IncModel = conn.models.ExamIncident;
      if (IncModel) {
        const result = await IncModel.updateMany(
          { tenantId: body.tenantId, studentId: body.userId },
          { $set: { studentId: '[GDPR_ERASED]' } }
        );
        summary['ExamIncident_studentId'] = result.modifiedCount;
      }

      // Anonymize email references
      if (body.email) {
        const emailModels = ['Certificate', 'Allegation', 'ExamAssignment'];
        for (const name of emailModels) {
          const model = conn.models[name];
          if (model) {
            const result = await model.updateMany(
              { tenantId: body.tenantId, userEmail: body.email },
              { $set: { userEmail: '[GDPR_ERASED]' } }
            );
            summary[`${name}_email`] = result.modifiedCount;
          }
        }
      }

      return NextResponse.json({ success: true, type: 'user', userId: body.userId, purged: summary });
    }

    // Full tenant data purge (existing behavior)
    const body = TenantPurgeSchema.parse(raw);
    await connectDB();
    const conn = getTenantConnection(body.dbPrefix, body.isolationStrategy);

    if (!conn.db) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    if (body.isolationStrategy === 'DATABASE_PER_TENANT') {
      await conn.db.dropDatabase();
      console.log(`[GDPR_PURGE] Dropped database ${body.dbPrefix} for tenant ${body.tenantId}`);
    } else {
      const collections = await conn.db.listCollections().toArray();
      const targetPrefix = `${body.dbPrefix}_`;
      let count = 0;
      for (const coll of collections) {
        if (coll.name.startsWith(targetPrefix)) {
          await conn.db.dropCollection(coll.name);
          count++;
        }
      }
      console.log(`[GDPR_PURGE] Dropped ${count} collections starting with ${targetPrefix} for tenant ${body.tenantId}`);
    }

    return NextResponse.json({ success: true, type: 'tenant', message: `Tenant ${body.tenantId} purged successfully` });
  } catch (error) {
    console.error('[GDPR_PURGE_ERROR]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
