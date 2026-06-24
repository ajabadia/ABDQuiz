'use client';

/**
 * @purpose Renderiza el panel de control del estudiante con puntuaciones de KPI, exámenes disponibles y intentos recientes.
 * @purpose_en Renders the student dashboard with KPI scores, available exams, and recent attempts.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:11,sig:lxxsoy
 * @lastUpdated 2026-06-24T10:55:14.758Z
 */

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Activity, BookOpen, BarChart3 } from 'lucide-react';
import { type DashboardData } from '@/actions/dashboard';
import { type CourseProgressResult } from '@/actions/course-progress';
import { KPISection } from '@/components/dashboard/KPISection';
import { AvailableExamsSection } from '@/components/dashboard/AvailableExamsSection';
import { RecentAttemptsSection } from '@/components/dashboard/RecentAttemptsSection';
import { CourseProgressSection } from '@/components/dashboard/CourseProgressSection';

interface StudentDashboardProps {
  data: DashboardData;
  progressData: CourseProgressResult | null;
}

export function StudentDashboard({ data, progressData }: StudentDashboardProps) {
  const t = useTranslations('common');
  const d = useTranslations('dashboard');
  const locale = useLocale();
  const { availableExams, recentAttempts } = data;

  return (
    <div className="flex flex-col gap-12 w-full animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Hero / Welcome */}
      <div className="flex flex-col gap-3 border-b border-border pb-8">
        <div className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
          <Activity size={14} className="text-primary" aria-hidden="true" />
          {t('appTitle')} • {d('portal')}
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none">
          {d('title')}
        </h1>
        <p className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed max-w-2xl">
          {d('subtitle')}
        </p>
      </div>

      {/* KPI Scorecards */}
      <KPISection data={data} />

      {/* Course Objective Progress */}
      {progressData && progressData.courses.length > 0 && (
        <CourseProgressSection courses={progressData.courses} />
      )}

      {/* Available Exams */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">
              {d('availableExams')}
            </h2>
          </div>
          {availableExams.length > 0 && (
            <Link
              href={`/${locale}/exams`}
              className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              {d('viewAll')} <ArrowRight size={12} />
            </Link>
          )}
        </div>
        <AvailableExamsSection availableExams={availableExams} />
      </div>

      {/* Recent Attempts */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">
              {d('recentAttempts')}
            </h2>
          </div>
          {recentAttempts.length > 0 && (
            <Link
              href={`/${locale}/history`}
              className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              {d('viewAll')} <ArrowRight size={12} />
            </Link>
          )}
        </div>
        <RecentAttemptsSection recentAttempts={recentAttempts} />
      </div>

      {/* Quick Actions */}
      <Separator className="bg-border" />
      <div className="flex flex-wrap gap-4">
        <Link
          href={`/${locale}/exams`}
          className="btn-primary-console h-12 px-6 text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer inline-flex items-center gap-2"
        >
          <BookOpen size={14} />
          {d('browseExams')}
        </Link>
        <Link
          href={`/${locale}/history`}
          className="btn-skip-console h-12 px-6 text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer inline-flex items-center gap-2"
        >
          <BarChart3 size={14} />
          {d('viewHistory')}
        </Link>
      </div>
    </div>
  );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ArrowRight({ size, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
