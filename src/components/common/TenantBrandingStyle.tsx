import { generateTenantCss } from '@abd/styles';

interface TenantBrandingTheme {
  primary: string;
  secondary?: string;
  background?: string;
  rounded?: boolean;
  radius?: string;
}

interface TenantBrandingStyleProps {
  theme?: TenantBrandingTheme | null;
}

/**
 * 🎨 TenantBrandingStyle: Centralized stylesheet injector
 * Safely generates and injects CSS custom properties based on multi-tenant branding.
 */
export function TenantBrandingStyle({ theme }: TenantBrandingStyleProps) {
  if (!theme) return null;

  let customCss = '';
  try {
    customCss = generateTenantCss(theme);
  } catch (err) {
    console.error('[TENANT_BRANDING_CSS_GENERATION_FAILED]', err);
  }

  if (!customCss) return null;

  return (
    <style
      id="tenant-branding-gateway"
      dangerouslySetInnerHTML={{ __html: customCss }}
    />
  );
}
