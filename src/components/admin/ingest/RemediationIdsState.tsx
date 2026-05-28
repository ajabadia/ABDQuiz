'use client';

import { useState } from 'react';
import { Check, Database, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FloatingSelector } from './FloatingSelector';
import { RemediationComplete } from './RemediationComplete';
import { HierarchyCheckboxes } from './HierarchyCheckboxes';
import { ConflictDescription } from './ConflictDescription';
import { useSpaceCourseLoader } from './hooks/useSpaceCourseLoader';
import type { ConflictQuestion } from './types';

interface RemediationIdsStateProps {
  conflicts: ConflictQuestion[];
  onApply: (resolution: {
    spaceId: string;
    courseId?: string;
    nullifyCourse: boolean;
    remember: boolean;
  }) => void;
  onBack: () => void;
}

export function RemediationIdsState({ conflicts, onApply, onBack }: RemediationIdsStateProps) {
  const ap = useTranslations('adminPortal');
  const currentConflict = conflicts[0];
  const allResolved = conflicts.length === 0;

  const [initialTotal] = useState(conflicts.length);
  const resolvedCount = initialTotal - conflicts.length;

  const {
    spaces, courses, loadingSpaces, loadingCourses,
    selectedSpaceId, setSelectedSpaceId,
    selectedCourseId, setSelectedCourseId,
    nullifyCourse, setNullifyCourse,
    remember, setRemember,
    applyDisabled, setApplyDisabled,
  } = useSpaceCourseLoader(currentConflict?.spaceId, currentConflict?.courseId);

  const handleApply = () => {
    if (!selectedSpaceId) return;
    setApplyDisabled(true);
    onApply({
      spaceId: selectedSpaceId,
      courseId: nullifyCourse ? undefined : selectedCourseId || undefined,
      nullifyCourse,
      remember,
    });
    setApplyDisabled(false);
    setSelectedCourseId('');
    setNullifyCourse(false);
  };

  if (allResolved) {
    return (
      <RemediationComplete
        title={ap('remediationIdsAllResolved')}
        description={ap('remediationIdsResolvedCount', { count: initialTotal })}
        actionLabel={ap('remediationConflictsContinue')}
        onAction={() => {}}
        onBack={onBack}
        backLabel={ap('btnBack')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="space-y-2">
        {currentConflict && (
          <ConflictDescription
            conflict={currentConflict}
            resolvedCount={resolvedCount}
            totalCount={initialTotal}
          />
        )}
      </div>

      <div className="space-y-5">
        <FloatingSelector
          value={selectedSpaceId}
          onChange={(id) => { setSelectedSpaceId(id); setSelectedCourseId(''); }}
          options={spaces}
          placeholder={ap('remediationIdsSelectSpace')}
          label={ap('remediationIdsSelectSpace')}
          icon={<Database className="w-3.5 h-3.5" />}
          loading={loadingSpaces}
          empty={spaces.length === 0}
          emptyMessage={ap('remediationIdsNoSpaces')}
          loadingMessage={ap('remediationIdsLoadingSpaces')}
          showSlug
        />

        {!nullifyCourse && selectedSpaceId && (
          <FloatingSelector
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            options={courses}
            placeholder={ap('remediationIdsSelectCourse')}
            label={ap('remediationIdsSelectCourse')}
            icon={<Layers className="w-3.5 h-3.5" />}
            loading={loadingCourses}
            empty={courses.length === 0}
            emptyMessage={ap('remediationIdsNoCourses')}
            loadingMessage={ap('remediationIdsLoadingCourses')}
          />
        )}

        <HierarchyCheckboxes
          nullifyCourse={nullifyCourse}
          onNullifyChange={(v) => { setNullifyCourse(v); if (v) setSelectedCourseId(''); }}
          remember={remember}
          onRememberChange={setRemember}
        />
      </div>

      <div className="flex gap-4 mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={ap('btnBack')}
          className="w-1/3 border border-border hover:bg-muted text-[10px] uppercase font-bold tracking-widest font-mono h-12"
        >
          {ap('btnBack')}
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!selectedSpaceId || applyDisabled}
          aria-label={ap('remediationIdsApply')}
          className="btn-primary-console flex-1 h-12 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          {ap('remediationIdsApply')}
        </button>
      </div>
    </div>
  );
}
