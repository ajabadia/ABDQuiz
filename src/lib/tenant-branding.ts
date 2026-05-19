import { headers } from 'next/headers';

export interface TenantBrandingTheme {
  primary: string;
  secondary?: string;
  background?: string;
  rounded?: boolean;
  radius?: string;
}

export interface TenantBranding {
  logoUrl?: string | null;
  theme?: TenantBrandingTheme | null;
}

/**
 * 🏢 Extract tenant subdomain from host header
 */
function getTenantSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  
  if (parts.length > 2) {
    const subdomain = parts[0];
    if (subdomain === 'www') return null;
    return subdomain;
  }
  
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  
  return null;
}

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
