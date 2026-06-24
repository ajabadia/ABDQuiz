/**
 * @purpose Renderiza la página de dashboard del estudiante con guardia de autenticación y manejo de errores.
 * @purpose_en Renders the student dashboard page with authentication guard and error handling.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:9,sig:17v1b1l
 * @lastUpdated 2026-06-24T10:55:07.789Z
 */

import { getTranslations } from 'next-intl/server';
import { getIndustrialSession } from '@ajabadia/satellite-sdk';
import { getStudentDashboardAction } from '@/actions/dashboard';
import { getStudentCourseProgressAction } from '@/actions/course-progress';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { GlobalFooter } from '@ajabadia/ecosystem-widgets';
import { StudentDashboard } from './StudentDashboard';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const d = await getTranslations('dashboard');
  const h = await getTranslations('home');

  // 🛡️ Auth guard — must be authenticated
  const session = await getIndustrialSession();
  if (!session?.user?.id) {
    redirect('/');
  }

  // Fetch dashboard data
  const result = await getStudentDashboardAction();
  const data = result.success && result.data ? result.data : null;

  // Fetch course progress data
  const progressResult = await getStudentCourseProgressAction();
  const progressData = progressResult.success && progressResult.data ? progressResult.data : null;

  if (!data) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
        <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />
        <div className="max-w-7xl mx-auto flex flex-col gap-10 z-10 relative">
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
            <p className="text-sm font-mono text-muted-foreground">{d('errorLoading')}</p>
            <Link
              href={`/${locale}`}
              className="text-xs font-mono text-primary hover:underline uppercase tracking-wider"
            >
              {d('backHome')}
            </Link>
          </div>
          <GlobalFooter
            label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`}
            opacity={20}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main">
      {/* Tactical grid background */}
      <div className="absolute inset-0 bg-industrial-grid mask-industrial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="max-w-7xl mx-auto flex flex-col gap-10 z-10 relative">

        {/* Back navigation */}
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Back to landing"
            title="Back to Landing"
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </Link>
        </div>

        {/* Student Dashboard */}
        <StudentDashboard data={data} progressData={progressData} />

        {/* Footer */}
        <GlobalFooter
          label={`${t('brandPart1')}${t('brandPart2')} ${h('version')}`}
          opacity={20}
        />
      </div>
    </main>
  );
}
