'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { getAnalyticsAction } from '@/actions/analytics';
import { type AnalyticsPayload } from '@/types/quiz';
import SparklineChart from './SparklineChart';
import PerformanceMetrics from './PerformanceMetrics';

export default function AnalyticsDashboard() {
  const t = useTranslations('analytics');
  const c = useTranslations('common');
  const locale = useLocale();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAnalyticsAction();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      fetchAnalytics().catch(console.error);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAnalytics]);

  if (!mounted) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">{c('initializing')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-top-2 duration-300">
      <div>
        <h1 className="text-lg font-black font-mono tracking-widest text-primary uppercase">{t('title')}</h1>
        <p className="text-[10px] uppercase font-mono text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">{c('initializing')}</div>
      ) : !data || data.totalAttempts === 0 ? (
        <Card className="p-12 text-center text-muted-foreground font-mono rounded-none border-white/5 bg-card/20 uppercase">{t('noAttempts')}</Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI and Map metrics */}
          <PerformanceMetrics
            totalAttempts={data.totalAttempts}
            completedAttempts={data.completedAttempts}
            averageScore={data.averageScore}
            avgTimePerQuestion={data.avgTimePerQuestion}
            modulePerformance={data.modulePerformance}
            difficultyPerformance={data.difficultyPerformance}
          />

          {/* SVG sparkline graph */}
          <SparklineChart data={data.timeline} title={t('timelineTitle')} />

          {/* Recent attempts Table */}
          <Card className="p-5 bg-card/20 border-white/5 rounded-none flex flex-col gap-4 overflow-x-auto">
            <div className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold font-mono">{t('recentAttempts')}</div>
            <table className="w-full font-mono text-[9px] text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground uppercase pb-2">
                  <th className="pb-2 font-bold">{t('dateHeader')}</th>
                  <th className="pb-2 font-bold">{t('modeHeader')}</th>
                  <th className="pb-2 font-bold">{t('scoreHeader')}</th>
                  <th className="pb-2 font-bold">{t('statusHeader')}</th>
                  <th className="pb-2 font-bold text-right">{t('actionHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAttempts.map(a => (
                  <tr key={a._id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                    <td className="py-2.5 text-muted-foreground">{a.startedAt}</td>
                    <td className="py-2.5 uppercase font-bold">{c(a.mode === 'mock' ? 'mockMode' : 'trainingMode')}</td>
                    <td className="py-2.5">
                      <span className="font-bold">{a.percentage}%</span>
                      <span className="text-muted-foreground/60 text-[8px] ml-1">({a.score} PTS)</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest ${a.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/${locale}/quiz/${a._id}/results`} className="text-primary hover:underline uppercase font-bold text-[8px] tracking-wider">{t('btnViewAnalysis')} &rarr;</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
