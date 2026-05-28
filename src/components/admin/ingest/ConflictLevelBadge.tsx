'use client';

import { AlertTriangle, CopyPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ConflictPair } from './types';

export function ConflictLevelBadge({ conflict }: { conflict: ConflictPair }) {
  const ap = useTranslations('adminPortal');
  const similarityPercent = conflict.similarityScore ? Math.round(conflict.similarityScore * 100) : null;
  const isLevel2 = conflict.level === 2;

  return (
    <div className={`p-3 border ${isLevel2 ? 'bg-destructive/5 border-destructive/20' : 'bg-warning/5 border-warning/20'}`}>
      <div className="flex items-start gap-3">
        {isLevel2 ? (
          <CopyPlus className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isLevel2 ? 'text-destructive' : 'text-warning'}`}>
            {isLevel2 ? ap('remediationConflictsLevel2') : ap('remediationConflictsLevel3')}
          </span>
          <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-mono">
            {isLevel2
              ? ap('remediationConflictsLevel2Desc')
              : ap('remediationConflictsLevel3Desc', { score: String(similarityPercent ?? 0) })}
          </p>
        </div>
      </div>
    </div>
  );
}
