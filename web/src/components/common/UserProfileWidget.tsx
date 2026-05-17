'use client';

import { ShieldCheck, Settings, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function UserProfileWidget() {
  const t = useTranslations('common');

  return (
    <div 
      className="fixed top-6 right-6 z-50 flex items-center gap-4 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2.5 shadow-xl select-none animate-in fade-in slide-in-from-top-2 duration-300 rounded-none"
      role="region"
      aria-label="User Profile Panel"
    >
      {/* User Info Segment */}
      <div className="flex flex-col items-end text-right">
        <span className="text-xs font-black tracking-widest text-foreground uppercase">
          {"Alberto Abadía"}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
            {"AJABADIA@GMAIL.COM"}
          </span>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="h-8 w-[1px] bg-white/10" aria-hidden="true" />

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button 
          type="button"
          aria-label={t('settings')}
          className="p-1 text-muted-foreground hover:text-primary transition-colors hover:scale-105 active:scale-95 duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <Settings className="w-4.5 h-4.5" aria-hidden="true" />
        </button>

        {/* Vertical Divider */}
        <div className="h-8 w-[1px] bg-white/10" aria-hidden="true" />

        <button 
          type="button"
          aria-label={t('logout')}
          className="p-1 text-muted-foreground hover:text-red-400 transition-colors hover:scale-105 active:scale-95 duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400/50"
        >
          <LogOut className="w-4.5 h-4.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
