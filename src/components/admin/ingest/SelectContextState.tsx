'use client';

/**
 * @purpose Gestiona el estado y la renderización de una interfaz de selección de contexto para espacios y cursos, incluyendo manejo de interacciones del usuario y visualización de componentes UI relevantes.
 * @purpose_en Manages the state and rendering of a context selection interface for spaces and courses, including handling user interactions and displaying relevant UI components.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:13d2ori
 * @lastUpdated 2026-06-23T19:48:09.869Z
 */

import { useState, useEffect } from 'react';
import { Layers, MapPin, Database } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getActiveSpacesAction, getCoursesBySpaceAction } from '@/actions/hierarchyValidation';
import { FloatingSelector } from './FloatingSelector';
import { ContextSkipBanner } from './ContextSkipBanner';
import { ContextActions } from './ContextActions';

interface SpaceOption {
  _id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
}

interface CourseOption {
  _id: string;
  name: string;
  active: boolean;
}

interface SelectContextStateProps {
  pendingCount: number;
  onApply: (context: { spaceId: string; courseId?: string }) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function SelectContextState({
  pendingCount,
  onApply,
  onSkip,
  onBack,
}: SelectContextStateProps) {
  const ap = useTranslations('adminPortal');

  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [skipMode, setSkipMode] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingSpaces(true);
      const result = await getActiveSpacesAction();
      if (result.success && result.data) setSpaces(result.data);
      setLoadingSpaces(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedSpaceId) return;
    // No synchronous setState — data is fetched asynchronously
    getCoursesBySpaceAction(selectedSpaceId)
      .then((result) => {
        if (result.success && result.data) {
          setCourses(result.data);
          if (result.data.length === 1) setSelectedCourseId(result.data[0]._id);
        }
      })
      .catch(() => {/* Silently fail */});
  }, [selectedSpaceId]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-primary">
          <MapPin className="w-6 h-6 animate-pulse" />
          <h2 className="text-lg font-black uppercase tracking-tight italic">
            {ap('selectContextTitle')}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
          {ap('selectContextSubtitle', { count: pendingCount })}
        </p>
      </div>

      <div className="h-[1px] bg-border w-full" />

      <div className="p-5 bg-primary/5 border border-primary/20 space-y-3">
        <div className="flex items-start gap-3">
          <Layers className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase leading-relaxed">
              {ap('selectContextDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <FloatingSelector
          value={selectedSpaceId}
          onChange={(id) => { setSelectedSpaceId(id); setSelectedCourseId(''); }}
          options={spaces}
          placeholder={ap('selectContextSelectSpace')}
          label={ap('selectContextSelectSpace')}
          icon={<Database className="w-3.5 h-3.5" />}
          loading={loadingSpaces}
          empty={spaces.length === 0}
          emptyMessage={ap('selectContextNoSpaces')}
          loadingMessage={ap('selectContextLoadingSpaces')}
          disabled={skipMode}
          showSlug
        />

        {selectedSpaceId && !skipMode && (
          <FloatingSelector
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            options={courses}
            placeholder={ap('selectContextSelectCourse')}
            label={ap('selectContextSelectCourse')}
            icon={<Layers className="w-3.5 h-3.5" />}
            loading={loadingCourses}
            empty={courses.length === 0}
            emptyMessage={ap('selectContextNoCourses')}
            loadingMessage={ap('selectContextLoadingCourses')}
          />
        )}

        {skipMode && <ContextSkipBanner />}
      </div>

      <ContextActions
        skipMode={skipMode}
        canApply={!!selectedSpaceId}
        onApply={() => {
          if (!selectedSpaceId) return;
          onApply({ spaceId: selectedSpaceId, courseId: selectedCourseId || undefined });
        }}
        onSkip={onSkip}
        onBack={onBack}
        onToggleSkip={() => setSkipMode(!skipMode)}
      />
    </div>
  );
}
