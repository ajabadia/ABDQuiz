'use client';

/**
 * @purpose Renderiza una bandera con un icono y texto para saltar la selección de contexto en el portal administrativo.
 * @purpose_en Renders a banner with an icon and text to skip context selection in the admin portal.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1c4tr5k
 * @lastUpdated 2026-06-23T17:41:27.509Z
 */

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
