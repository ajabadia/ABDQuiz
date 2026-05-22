import { ensureIndustrialAccess } from './session';

/**
 * Resolves the tenant context for a request or page based on session and searchParams.
 * Implements the security guard (Anti-IDOR):
 * - If the user is SUPER_ADMIN and queryTenantId is provided, returns that queryTenantId.
 * - Otherwise, returns the user's default session tenantId, ignoring any manipulated query params.
 */
type ResolvedSearchParams = URLSearchParams | Record<string, string | string[] | undefined>;

export async function resolveTenantContext(
  searchParams: ResolvedSearchParams | Promise<ResolvedSearchParams>
): Promise<string> {
  // 🛡️ Ecosystem Identity Guard
  const user = await ensureIndustrialAccess('ADMIN');
  
  // Resolve searchParams if it is passed as a Promise (Next.js 15+ async params)
  const resolvedParams: ResolvedSearchParams = searchParams instanceof Promise
    ? await searchParams
    : searchParams;
  
  let queryTenantId: string | null = null;
  
  if (resolvedParams) {
    if (resolvedParams instanceof URLSearchParams) {
      queryTenantId = resolvedParams.get('tenantId');
    } else {
      const val = (resolvedParams as Record<string, string | string[] | undefined>)['tenantId'];
      if (typeof val === 'string') {
        queryTenantId = val;
      } else if (Array.isArray(val)) {
        queryTenantId = val[0] ?? null;
      }
    }
  }

  // 🛡️ Anti-IDOR: Only allow context shifting if user is a SUPER_ADMIN
  if (user.role === 'SUPER_ADMIN' && queryTenantId) {
    return queryTenantId;
  }
  
  return user.tenantId;
}
