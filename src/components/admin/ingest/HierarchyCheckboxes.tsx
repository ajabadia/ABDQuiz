'use client';

import { useTranslations } from 'next-intl';

interface HierarchyCheckboxesProps {
  nullifyCourse: boolean;
  onNullifyChange: (value: boolean) => void;
  remember: boolean;
  onRememberChange: (value: boolean) => void;
}

export function HierarchyCheckboxes({
  nullifyCourse,
  onNullifyChange,
  remember,
  onRememberChange,
}: HierarchyCheckboxesProps) {
  const ap = useTranslations('adminPortal');

  return (
    <>
      <label className="flex items-start gap-3 p-4 border border-border hover:border-warning/30 bg-card/30 hover:bg-warning/5 cursor-pointer transition-all group">
        <input
          type="checkbox"
          checked={nullifyCourse}
          onChange={(e) => { onNullifyChange(e.target.checked); }}
          className="mt-0.5 accent-warning w-4 h-4"
        />
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground group-hover:text-warning transition-colors">
            {ap('remediationIdsNullifyHierarchy')}
          </span>
          <p className="text-[9px] text-muted-foreground uppercase leading-relaxed">
            {ap('remediationIdsNullifyDesc')}
          </p>
        </div>
      </label>

      <label className="flex items-start gap-3 p-4 border border-border hover:border-primary/30 bg-card/30 hover:bg-primary/5 cursor-pointer transition-all group">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange(e.target.checked)}
          className="mt-0.5 accent-primary w-4 h-4"
        />
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
            {ap('remediationIdsRemember')}
          </span>
          <p className="text-[9px] text-muted-foreground uppercase leading-relaxed">
            {ap('remediationIdsRememberDesc')}
          </p>
        </div>
      </label>
    </>
  );
}
