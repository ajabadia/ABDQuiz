'use client';

/**
 * @purpose Renderiza un componente selector de inquilino utilizando el connector `TenantSelectorConnector` de la biblioteca `@ajabadia/ecosystem-widgets`.
 * @purpose_en Renders a tenant selector component using the `TenantSelectorConnector` from the `@ajabadia/ecosystem-widgets` library.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1q3njgj
 * @lastUpdated 2026-06-23T19:50:40.441Z
 */

import { TenantSelectorConnector } from "@ajabadia/ecosystem-widgets";

interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
  tenantId?: string;
}

interface TenantSelectorProps {
  sessionUser?: SessionUser;
  variant?: 'dropdown' | 'trigger' | 'content';
  isOpen?: boolean;
}

export function TenantSelector({ sessionUser, variant, isOpen }: TenantSelectorProps) {
  return <TenantSelectorConnector sessionUser={sessionUser} variant={variant} isOpen={isOpen} enableContexts useRouterPush />;
}
