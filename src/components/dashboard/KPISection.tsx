'use client';

/**
 * @purpose Renderiza una sección que muestra indicadores clave de rendimiento (KPIs) como intentos totales, completados, puntuación media y actividad reciente.
 * @purpose_en Renders a section displaying key performance indicators (KPIs) such as total attempts, completed attempts, average score, and recent activity.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:163zzhs
 * @lastUpdated 2026-06-23T19:49:15.546Z
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { BarChart3, Trophy, Activity, Clock } from 'lucide-react';
import type { DashboardData } from '@/actions/dashboard';

interface KPISectionProps {
  data: DashboardData;
}

export function KPISection({ data }: KPISectionProps) {
  const d = useTranslations('dashboard');
  const { totalAttempts, completedAttempts, averageScore, recentAttempts } = data;

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
  );
}
