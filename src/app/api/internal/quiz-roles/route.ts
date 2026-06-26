/**
 * @purpose Gestiona solicitudes de API para asignar y gestionar roles de quiz dentro de un inquilino.
 * @purpose_en Manages API requests for assigning and managing quiz roles within a tenant.
 * @refactorable true (contains business logic and database operations)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:4,imports:3,sig:kcx6kd
 * @lastUpdated 2026-06-26T10:02:02.315Z
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getTenantConnection } from '@ajabadia/satellite-sdk/db';
import { z } from 'zod';

function authGuard(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  return !!(secret && secret === process.env.ABD_INTERNAL_SECRET);
}

function getModel(tenantId: string) {
  const conn = getTenantConnection(tenantId, 'COLLECTION_PREFIX');
  const model = conn.models.QuizUserRole;
  if (!model) throw new Error('QuizUserRole model not found in connection');
  return model;
}

const AssignSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  scopeType: z.enum(['space', 'course', 'exam_config']),
  scopeId: z.string().min(1),
  roleType: z.enum(['CREATOR', 'AUDITOR']),
  assignedBy: z.string().min(1),
});

const BulkAssignSchema = z.object({
  tenantId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1),
  scopeType: z.enum(['space', 'course', 'exam_config']),
  scopeId: z.string().min(1),
  roleType: z.enum(['CREATOR', 'AUDITOR']),
  assignedBy: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    if (!authGuard(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await connectDB();
    const QuizUserRole = getModel(tenantId);

    const query: Record<string, unknown> = { tenantId };
    const scopeType = searchParams.get('scopeType');
    const scopeId = searchParams.get('scopeId');
    if (scopeType) query.scopeType = scopeType;
    if (scopeId) query.scopeId = scopeId;

    const roles = await QuizUserRole.find(query).sort({ createdAt: -1 }).lean();
    const data = roles.map((r: Record<string, unknown>) => ({ ...r, _id: String(r._id) }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[QUIZ_ROLES_API] GET error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!authGuard(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.json();
    const body = AssignSchema.parse(raw);

    await connectDB();
    const QuizUserRole = getModel(body.tenantId);

    const role = await QuizUserRole.create({
      tenantId: body.tenantId,
      userId: body.userId,
      scopeType: body.scopeType,
      scopeId: body.scopeId,
      roleType: body.roleType,
      assignedBy: body.assignedBy,
    });

    const obj = role.toObject();
    return NextResponse.json({ data: { ...obj, _id: String(obj._id) } }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'DUPLICATE_ROLE' }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[QUIZ_ROLES_API] POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!authGuard(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');
    const tenantId = searchParams.get('tenantId');
    if (!roleId || !tenantId) {
      return NextResponse.json({ error: 'roleId and tenantId are required' }, { status: 400 });
    }

    await connectDB();
    const QuizUserRole = getModel(tenantId);

    const result = await QuizUserRole.deleteOne({ _id: roleId, tenantId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'ROLE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[QUIZ_ROLES_API] DELETE error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: z.infer<typeof BulkAssignSchema> = {} as any;
  try {
    if (!authGuard(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.json();
    body = BulkAssignSchema.parse(raw);

    await connectDB();
    const QuizUserRole = getModel(body.tenantId);

    const docs = body.userIds.map((userId) => ({
      tenantId: body.tenantId,
      userId,
      scopeType: body.scopeType,
      scopeId: body.scopeId,
      roleType: body.roleType,
      assignedBy: body.assignedBy,
    }));

    const result = await QuizUserRole.insertMany(docs, { ordered: false });
    return NextResponse.json({ data: { assigned: result.length, skipped: body.userIds.length - result.length } }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { writeErrors?: unknown[]; insertedCount?: number };
    if (err.writeErrors !== undefined || err.insertedCount !== undefined) {
      const assigned = err.insertedCount ?? 0;
      const total = (body?.userIds?.length ?? 0);
      return NextResponse.json({
        data: { assigned, skipped: total - assigned },
        error: `partial failure: ${total - assigned} duplicates`,
      }, { status: 207 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('[QUIZ_ROLES_API] PATCH error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
