/**
 * @purpose Gestiona el contexto de ejecución para las asignaciones de examen conectando a una base de datos, recuperando una sesión industrial y validando el acceso del inquilino.
 * @purpose_en Manages the execution context for exam assignments by connecting to a database, retrieving an industrial session, and validating tenant access.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:4,sig:190uymn
 * @lastUpdated 2026-06-26T10:01:15.847Z
 */

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB } from '@ajabadia/satellite-sdk/db';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import type { TenantContext } from '@ajabadia/satellite-sdk/db';

export interface SessionWithTenant {
  user: {
    id: string;
    tenantId: string;
    email?: string;
    role?: string;
  };
}

export class AssignmentExecutionContext {
  session: SessionWithTenant;
  activeTenantId: string;

  constructor(session: SessionWithTenant, tenantId: string) {
    this.session = session;
    this.activeTenantId = tenantId;
  }

  static async create(explicitCtx?: TenantContext | null): Promise<AssignmentExecutionContext> {
    await connectDB();
    const session = await getIndustrialSession();
    if (!session?.user?.id || !session?.user?.tenantId) {
      throw new Error('Unauthorized');
    }
    const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;
    return new AssignmentExecutionContext(session as unknown as SessionWithTenant, activeTenantId);
  }
}

export function validateTenantAccess(
  resourceTenantId: string,
  ctx: AssignmentExecutionContext
): boolean {
  return (
    resourceTenantId === ctx.activeTenantId ||
    ctx.session.user.role === 'SUPER_ADMIN'
  );
}
