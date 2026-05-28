'use client';

import { AlertTriangle, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ProgressBar } from './ProgressBar';
import type { ConflictQuestion } from './types';

interface ConflictDescriptionProps {
  conflict: ConflictQuestion;
  resolvedCount: number;
  totalCount: number;
}

export function ConflictDescription({ conflict, resolvedCount, totalCount }: ConflictDescriptionProps) {
  const ap = useTranslations('adminPortal');

  const desc = (() => {
    switch (conflict.errorType) {
      case 'course_not_in_space':
        return ap('remediationIdsCourseNotInSpace', {
          course: conflict.courseName || conflict.courseId || '?',
          space: conflict.spaceName || conflict.spaceId || '?',
        });
      case 'space_inactive':
      case 'space_not_found':
        return ap('remediationIdsSpaceInactive', {
          space: conflict.spaceName || conflict.spaceId || '?',
        });
      case 'course_inactive':
      case 'course_not_found':
        return ap('remediationIdsCourseInactive', {
          course: conflict.courseName || conflict.courseId || '?',
        });
      default:
        if (!conflict.spaceId) return ap('remediationIdsNoSpace');
        if (!conflict.courseId) return ap('remediationIdsNoCourse');
        return `${ap('remediationIdsConflict')} ${conflict.spaceId} / ${conflict.courseId}`;
    }
  })();

  return (
    <>
      <div className="flex items-center gap-3 text-warning">
        <Layers className="w-6 h-6 animate-pulse" />
        <h2 className="text-lg font-black uppercase tracking-tight italic">
          {ap('remediationIdsTitle')}
        </h2>
      </div>

      <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
        {ap('remediationIdsSubtitle', { count: totalCount })}
      </p>

      <div className="h-[1px] bg-border w-full" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {ap('remediationIdsProgress', { current: resolvedCount + 1, total: totalCount })}
        </span>
        <ProgressBar current={resolvedCount + 1} total={totalCount} className="flex-1 h-1.5 bg-muted" />
      </div>

      <div className="p-5 bg-muted border border-warning/20 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <span className="text-[8px] font-mono text-warning uppercase tracking-widest font-bold">
              {ap('remediationIdsConflict')}
            </span>
            <p className="text-xs text-muted-foreground font-mono uppercase leading-relaxed">{desc}</p>
            <p className="text-sm font-bold text-foreground leading-relaxed line-clamp-2">
              {conflict.pregunta}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
