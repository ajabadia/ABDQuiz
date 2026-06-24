'use client';

/**
 * @purpose Renderiza una sección que muestra intentos de prueba recientes con detalles como nombre del examen, fecha, puntuación y estado.
 * @purpose_en Renders a section displaying recent quiz attempts with details such as exam name, date, score, and status.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:6,sig:1yyzl7s
 * @lastUpdated 2026-06-23T19:49:19.118Z
 */

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { History, ArrowRight } from 'lucide-react';
import type { DashboardData } from '@/actions/dashboard';

interface RecentAttemptsSectionProps {
  recentAttempts: DashboardData['recentAttempts'];
}

export function RecentAttemptsSection({ recentAttempts }: RecentAttemptsSectionProps) {
  const d = useTranslations('dashboard');
  const locale = useLocale();

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (recentAttempts.length === 0) {
    return (
      <Card className="p-10 bg-card/20 border-border rounded-none flex flex-col items-center justify-center text-center gap-4">
        <History className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {d('noAttemptsYet')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-card/20 border-border rounded-none overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[10px] text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground uppercase">
              <th className="p-4 font-bold tracking-wider">{d('examHeader')}</th>
              <th className="p-4 font-bold tracking-wider">{d('dateHeader')}</th>
              <th className="p-4 font-bold tracking-wider">{d('scoreHeader')}</th>
              <th className="p-4 font-bold tracking-wider">{d('statusHeader')}</th>
              <th className="p-4 font-bold tracking-wider text-right">{d('actionHeader')}</th>
            </tr>
          </thead>
          <tbody>
            {recentAttempts.map((a) => (
              <tr
                key={a._id}
                className="border-b border-border/50 hover:bg-white/[0.02] transition-all"
              >
                <td className="p-4 text-foreground font-bold max-w-[180px] truncate">
                  {a.examName}
                </td>
                <td className="p-4 text-muted-foreground whitespace-nowrap">
                  {formatDate(a.startedAt)} {formatTime(a.startedAt)}
                </td>
                <td className="p-4">
                  <span className="font-bold text-foreground">{a.percentage}%</span>
                  <span className="text-muted-foreground/60 text-[8px] ml-1">
                    ({a.score} pts)
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest ${
                      a.status === 'completed'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : a.status === 'timeout'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}
                  >
                    {a.status === 'completed'
                      ? d('statusCompleted')
                      : a.status === 'timeout'
                        ? d('statusTimeout')
                        : d('statusInProgress')}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {a.status !== 'in_progress' ? (
                    <Link
                      href={`/${locale}/quiz/${a._id}/results`}
                      className="text-primary hover:underline uppercase font-bold text-[8px] tracking-wider"
                    >
                      {d('viewDetail')} &rarr;
                    </Link>
                  ) : (
                    <Link
                      href={`/${locale}/quiz/${a._id}`}
                      className="text-yellow-400 hover:underline uppercase font-bold text-[8px] tracking-wider"
                    >
                      {d('continue')} &rarr;
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
