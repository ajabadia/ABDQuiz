/**
 * @purpose Renderiza la página administrativa para gestionar plantillas de prompts del modelo de lenguaje LLM.
 * @purpose_en Renders the admin page for managing LLM prompt templates.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:4tzzv3
 * @lastUpdated 2026-06-24T10:54:57.042Z
 */

import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess } from '@ajabadia/satellite-sdk/auth-middleware';
import { resolveTenantContext } from '@/lib/tenant-context';
import { ArrowLeft, Brain } from 'lucide-react';
import { AdminPageHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { Link } from '@/i18n/routing';
import { PromptsManager } from './PromptsManager';

export default async function AdminPromptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const admin = await getTranslations('admin');
  const h = await getTranslations('home');
  const ap = await getTranslations('adminPortal');

  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const backUrl = isSuperAdmin ? `/admin?tenantId=${resolvedTenantId}` : '/admin';
  const tenantSuffix = resolvedTenantId ? `?tenantId=${resolvedTenantId}` : '';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <AdminPageHeader
          icon={Brain}
          breadcrumb={<>{ap('gobernanza')} • Prompt Templates</>}
          title="Prompt Templates"
          backButton={
            <Link
              href={backUrl}
              className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
              aria-label={ap('btnBack')}
              title="Back to Dashboard"
            >
              <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          }
          description={
            <>Manage LLM prompt templates for AI question generation | Tenant: <span className="text-primary font-bold">{resolvedTenantId}</span></>
          }
        />

        <PromptsManager tenantId={resolvedTenantId} tenantSuffix={tenantSuffix} />

        <GlobalFooter
          label={`${admin('brandPart1')}${admin('brandPart2')} ${h('version')}`}
          opacity={20}
        />
      </div>
    </main>
  );
}
