import { connectDB, getIndustrialSession, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import type { TenantContext } from '@ajabadia/satellite-sdk';

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
