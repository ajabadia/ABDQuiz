'use client';

/**
 * @purpose Renderiza una sección que muestra los exámenes disponibles con opciones para lanzarlos.
 * @purpose_en Renders a section displaying available exams with options to launch them.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:7,sig:17yx25j
 * @lastUpdated 2026-06-23T19:49:11.421Z
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { BookOpen, ArrowRight, Play } from 'lucide-react';
import { startQuizAction } from '@/actions/quiz';
import type { DashboardData } from '@/actions/dashboard';

interface AvailableExamsSectionProps {
  availableExams: DashboardData['availableExams'];
}

const btnClass = (isEven: boolean) =>
  isEven
    ? 'btn-primary-console w-full h-11 text-[9px] cursor-pointer flex items-center justify-center gap-2'
    : 'btn-skip-console w-full h-11 text-[9px] cursor-pointer flex items-center justify-center gap-2';

export function AvailableExamsSection({ availableExams }: AvailableExamsSectionProps) {
  const t = useTranslations('common');
  const d = useTranslations('dashboard');

  if (availableExams.length === 0) {
    return (
      <Card className="p-10 bg-card/20 border-border rounded-none flex flex-col items-center justify-center text-center gap-4">
        <BookOpen className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {d('noExamsAvailable')}
        </p>
      </Card>
    );
  }

  return (
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
                  className={btnClass(isEven)}
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
  );
}
