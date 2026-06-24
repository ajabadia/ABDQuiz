'use client';

/**
 * @purpose Renderiza un componente para establecer una configuración de examen con un curso, proporcionando un menú desplegable para selección y un botón para guardar los cambios.
 * @purpose_en Renders a component to link an exam configuration with a course, providing a dropdown for selection and a button to save the changes.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1pa186j
 * @lastUpdated 2026-06-24T08:18:25.940Z
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link2, Link2Off, Loader2 } from 'lucide-react';
import { updateExamConfigAction } from '@/actions/examConfig';
import { toast } from 'sonner';

interface ExamCourseLinkProps {
  examConfigId: string;
  currentCourseId?: string;
  courses: { _id: string; name: string }[];
}

export default function ExamCourseLink({ examConfigId, currentCourseId, courses }: ExamCourseLinkProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const [selectedCourseId, setSelectedCourseId] = useState(currentCourseId || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateExamConfigAction(examConfigId, {
        courseId: selectedCourseId || undefined,
      } as any);
      if (res.success) {
        toast.success(t('courseLinked') || 'Curso vinculado');
        router.refresh();
      } else {
        toast.error(res.error || 'Error');
      }
    } catch {
      toast.error('Error al vincular curso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
      <div className="flex items-center gap-3">
        {currentCourseId ? (
          <Link2 className="w-5 h-5 text-emerald-500 shrink-0" />
        ) : (
          <Link2Off className="w-5 h-5 text-slate-500 shrink-0" />
        )}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-widest shrink-0">
            {t('linkedCourse') || 'Curso vinculado'}
          </span>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-none px-3 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-primary/50"
          >
            <option value="">{t('noCourseSelected') || '-- Sin curso --'}</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none font-mono text-[10px] uppercase h-8 shrink-0"
            onClick={handleSave}
            disabled={saving || selectedCourseId === (currentCourseId || '')}
          >
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            {t('btnLink') || 'Vincular'}
          </Button>
        </div>
      </div>
    </div>
  );
}
