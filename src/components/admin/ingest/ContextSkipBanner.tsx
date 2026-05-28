'use client';

import { SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ContextSkipBanner() {
  const ap = useTranslations('adminPortal');

  return (
    <div className="p-4 border border-warning/20 bg-warning/5">
      <div className="flex items-center gap-3">
        <SkipForward className="w-5 h-5 text-warning shrink-0" />
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
            {ap('selectContextSkip')}
          </span>
          <p className="text-[9px] text-muted-foreground uppercase leading-relaxed">
            {ap('selectContextSkipDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
