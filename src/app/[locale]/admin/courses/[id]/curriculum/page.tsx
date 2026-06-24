/**
 * @purpose Renders a página para gestionar el currículum de un curso, incluyendo mostrar y editar objetivos.
 * @purpose_en Renders a page for managing the curriculum of a course, including displaying and editing objectives.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:11,sig:1oqdx74
 * @lastUpdated 2026-06-24T08:18:12.337Z
 */

import { getTranslations } from 'next-intl/server';
import { ensureIndustrialAccess, withTenantContext, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import Course from '@/models/Course';
import { notFound } from 'next/navigation';
import { connectDB } from '@ajabadia/satellite-sdk';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { AdminPageHeader } from '@ajabadia/styles';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import CurriculumEditor from '@/components/admin/CurriculumEditor';

export default async function CourseCurriculumPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('admin');
  const h = await getTranslations('home');
  const ap = await getTranslations('adminPortal');
  const user = await ensureIndustrialAccess('ADMIN');
  const resolvedTenantId = await resolveTenantContext(searchParams);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const tenantSuffix = isSuperAdmin ? `?tenantId=${resolvedTenantId}` : '';

  const explicitCtx = await resolveTargetTenantContext(resolvedTenantId);
  const { course, objectives } = await withTenantContext(async () => {
    await connectDB();
    const c = await Course.findById(id).lean();
    if (!c) return { course: null, objectives: [] };
    return { course: c, objectives: (c.objectives as any[]) || [] };
  }, explicitCtx);

  if (!course || (course.tenantId !== user.tenantId && !isSuperAdmin)) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <AdminPageHeader
          icon={BookOpen}
          breadcrumb={<>{ap('gobernanza')} • {t('coursesTitle')} • Currículum</>}
          title={`${course.name} · Currículum`}
          backButton={
            <Link
              href={`/${locale}/admin/courses${tenantSuffix}`}
              className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
              aria-label={ap('btnBack')}
            >
              <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          }
          description={`Gestiona los objetivos de aprendizaje del curso`}
        />

        <CurriculumEditor courseId={id} initialObjectives={objectives} />

        <GlobalFooter label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`} opacity={20} />
      </div>
    </main>
  );
}
