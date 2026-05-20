import { headers } from 'next/headers';
import { getTenantSubdomain, type TenantBranding } from '@abd/satellite-sdk';

/**
 * 🎨 Resolve tenant branding via subdomain API.
 * Returns branding config or null. Cached for 1 hour.
 */
export async function resolveTenantBranding(): Promise<TenantBranding | null> {
  const headersList = await headers();
  const host = headersList.get('host');
  const subdomain = getTenantSubdomain(host);

  if (!subdomain) return null;

  try {
    const providerUrl = process.env.AUTH_PROVIDER_URL || 'https://abd-auth.vercel.app';
    const res = await fetch(`${providerUrl}/api/auth/tenant/info?subdomain=${subdomain}`, {
      next: { revalidate: 3600 }
    } as RequestInit & { next?: { revalidate: number } });
    if (res.ok) {
      const tenantData = await res.json() as { branding: TenantBranding | null };
      return tenantData.branding;
    }
  } catch (err) {
    console.error('[TENANT_BRANDING_RESOLUTION_ERROR]', err);
  }

  return null;
}
