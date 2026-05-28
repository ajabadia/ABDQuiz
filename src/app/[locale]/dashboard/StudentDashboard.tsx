'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { startQuizAction } from '@/actions/quiz';
import { type DashboardData } from '@/actions/dashboard';
import {
  BookOpen,
  BarChart3,
  Clock,
  Trophy,
  Activity,
  ArrowRight,
  History,
  Play,
} from 'lucide-react';

interface StudentDashboardProps {
  data: DashboardData;
}

export function StudentDashboard({ data }: StudentDashboardProps) {
  const t = useTranslations('common');
  const d = useTranslations('dashboard');
  const locale = useLocale();

  const { availableExams, recentAttempts, totalAttempts, completedAttempts, averageScore } = data;

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

  const kpis = [
    {
      icon: BarChart3,
      label: d('totalAttempts'),
      value: totalAttempts,
    },
    {
      icon: Trophy,
      label: d('completed'),
      value: completedAttempts,
    },
    {
      icon: Activity,
      label: d('averageScore'),
      value: `${averageScore}%`,
      highlight: true,
    },
    {
      icon: Clock,
      label: d('recentActivity'),
      value: recentAttempts.length > 0 ? formatDate(recentAttempts[0].startedAt) : '—',
    },
  ];

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card
            key={i}
            className="p-5 bg-card/30 border-border rounded-none flex flex-col justify-between min-h-[90px] hover:border-primary/20 transition-all select-none"
          >
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <span className={`text-2xl font-black font-mono tracking-tight ${kpi.highlight ? 'text-primary' : 'text-foreground'}`}>
              {kpi.value}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono font-bold mt-1">
              {kpi.label}
            </span>
          </Card>
        ))}
      </div>

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

        {availableExams.length === 0 ? (
          <Card className="p-10 bg-card/20 border-border rounded-none flex flex-col items-center justify-center text-center gap-4">
            <BookOpen className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {d('noExamsAvailable')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableExams.slice(0, 6).map((config, index) => {
              const launchAction = startQuizAction.bind(null, config._id);
              const isEven = index % 2 === 0;
              return (
                <Card
                  key={config._id}
                  className="group relative p-6 bg-card/40 border-border hover:border-primary/40 transition-all duration-500 overflow-hidden backdrop-blur-sm rounded-none flex flex-col justify-between min-h-[240px]"
                >
                  <div>
                    <div
                      className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity font-mono text-6xl font-black select-none"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <h3 className="text-lg font-bold mb-2 uppercase tracking-tight text-foreground">
                      {config.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed font-sans line-clamp-2">
                      {config.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex gap-3 mb-4 text-[8px] font-mono uppercase text-muted-foreground/50 border-t border-border pt-3">
                      <span>{config.questionCount} Qs</span>
                      <span>•</span>
                      <span>
                        {config.globalTimeLimitSeconds
                          ? `${Math.round(config.globalTimeLimitSeconds / 60)} min`
                          : '∞'}
                      </span>
                      <span>•</span>
                      <span className="text-primary">{config.scoringMode}</span>
                    </div>

                    <form action={launchAction}>
                      <button
                        className={
                          isEven
                            ? 'btn-primary-console w-full h-11 text-[9px] cursor-pointer flex items-center justify-center gap-2'
                            : 'btn-skip-console w-full h-11 text-[9px] cursor-pointer flex items-center justify-center gap-2'
                        }
                        aria-label={config.name}
                      >
                        <Play size={12} />
                        {t('launch')}
                      </button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Attempts */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary" aria-hidden="true" />
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

        {recentAttempts.length === 0 ? (
          <Card className="p-10 bg-card/20 border-border rounded-none flex flex-col items-center justify-center text-center gap-4">
            <History className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {d('noAttemptsYet')}
            </p>
          </Card>
        ) : (
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
        )}
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
