'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import {
  type ModuleAnalytics,
  type DifficultyAnalytics
} from '@/types/quiz';

interface PerformanceMetricsProps {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  avgTimePerQuestion: number;
  modulePerformance: ModuleAnalytics[];
  difficultyPerformance: DifficultyAnalytics;
}

export default function PerformanceMetrics({
  totalAttempts,
  completedAttempts,
  averageScore,
  avgTimePerQuestion,
  modulePerformance,
  difficultyPerformance
}: PerformanceMetricsProps) {
  const t = useTranslations('analytics');
  const c = useTranslations('common');

  const getBarColor = (pct: number) => {
    if (pct >= 75) return 'bg-green-500/80';
    if (pct >= 50) return 'bg-yellow-500/80';
    return 'bg-red-500/80';
  };

  const kpis = [
    { label: t('kpiAttempts'), value: totalAttempts },
    { label: t('kpiCompleted'), value: completedAttempts },
    { label: t('kpiAvgScore'), value: `${averageScore}%`, highlight: true },
    { label: t('kpiAvgTime'), value: t('avgTimeValue', { seconds: avgTimePerQuestion }) }
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 4 Cards Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="p-4 bg-card/30 border-white/5 rounded-none flex flex-col justify-between min-h-[80px] hover:border-primary/20 transition-all select-none">
            <span className="text-[8px] uppercase tracking-widest text-muted-foreground/80 font-mono font-bold">{kpi.label}</span>
            <span className={`text-xl font-bold font-mono tracking-wider mt-2 ${kpi.highlight ? 'text-primary' : 'text-foreground'}`}>
              {kpi.value}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module Performance Map */}
        <Card className="p-5 md:col-span-2 bg-card/25 border-white/5 rounded-none flex flex-col gap-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold font-mono">{t('cognitiveMap')}</div>
          <div className="flex flex-col gap-3 font-mono text-[9px]">
            {modulePerformance.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground uppercase">{t('noAttempts')}</div>
            ) : (
              modulePerformance.slice(0, 5).map((m, i) => {
                const widthStyle = { width: `${m.percentage}%` };
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="font-bold text-foreground">MOD: {m.module}</span>
                      <span>{m.correct}/{m.answered} ({m.percentage}%)</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 relative">
                      <div className={`h-full ${getBarColor(m.percentage)} transition-all duration-500`} style={widthStyle} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Difficulty breakdown */}
        <Card className="p-5 bg-card/25 border-white/5 rounded-none flex flex-col gap-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-primary font-bold font-mono">{c('performance')}</div>
          <div className="flex flex-col justify-around h-full gap-4 font-mono text-[9px] py-2">
            {(['easy', 'medium', 'hard'] as const).map(level => {
              const data = difficultyPerformance[level];
              const label = level === 'easy' ? 'diffEasy' : level === 'medium' ? 'diffMedium' : 'diffHard';
              return (
                <div key={level} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className={`uppercase font-bold ${level === 'easy' ? 'text-green-400' : level === 'hard' ? 'text-red-400' : 'text-yellow-400'}`}>{c(label)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{data.correct}/{data.total}</span>
                    <span className="font-bold text-foreground text-right w-8">{data.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
