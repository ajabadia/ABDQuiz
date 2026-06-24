'use client';

/**
 * @purpose Gestiona y renderiza el editor de currículum para un curso, permitiendo a los usuarios agregar, editar y guardar objetivos dentro de módulos.
 * @purpose_en Manages and renders the curriculum editor for a course, allowing users to add, edit, and save objectives within modules.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:9,sig:960ut6
 * @lastUpdated 2026-06-24T08:18:16.739Z
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, Loader2, BookOpen } from 'lucide-react';
import { type ICourseObjective } from '@/models/Course';
import { setCourseObjectivesAction } from '@/actions/courseObjectives';
import { toast } from 'sonner';

interface CurriculumEditorProps {
  courseId: string;
  initialObjectives: ICourseObjective[];
}

export default function CurriculumEditor({ courseId, initialObjectives }: CurriculumEditorProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const [objectives, setObjectives] = useState<ICourseObjective[]>(initialObjectives || []);
  const [saving, setSaving] = useState(false);

  const updateModuleBlock = (idx: number, field: 'module' | 'block', value: string) => {
    const updated = [...objectives];
    updated[idx] = { ...updated[idx], [field]: value };
    setObjectives(updated);
  };

  const updateObjective = (groupIdx: number, objIdx: number, value: string) => {
    const updated = [...objectives];
    const newObjectives = [...(updated[groupIdx].objectives || [])];
    newObjectives[objIdx] = value;
    updated[groupIdx] = { ...updated[groupIdx], objectives: newObjectives };
    setObjectives(updated);
  };

  const addObjective = (groupIdx: number) => {
    const updated = [...objectives];
    updated[groupIdx] = {
      ...updated[groupIdx],
      objectives: [...(updated[groupIdx].objectives || []), '']
    };
    setObjectives(updated);
  };

  const removeObjective = (groupIdx: number, objIdx: number) => {
    const updated = [...objectives];
    const newObjectives = [...(updated[groupIdx].objectives || [])];
    newObjectives.splice(objIdx, 1);
    updated[groupIdx] = { ...updated[groupIdx], objectives: newObjectives };
    setObjectives(updated);
  };

  const addModuleBlock = () => {
    setObjectives([...objectives, { module: '', block: '', objectives: [''] }]);
  };

  const removeModuleBlock = (groupIdx: number) => {
    setObjectives(objectives.filter((_, i) => i !== groupIdx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = objectives.filter(o => o.module.trim() && o.block.trim());
      const res = await setCourseObjectivesAction(courseId, cleaned);
      if (res.success) {
        toast.success(t('curriculumSaved') || 'Currículum guardado');
        router.refresh();
      } else {
        toast.error(res.error || 'Error al guardar');
      }
    } catch {
      toast.error('Error al guardar el currículum');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {objectives.length === 0 && (
        <div className="p-12 bg-card/10 border border-dashed border-white/5 flex flex-col items-center gap-4 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            {t('noObjectives') || 'No hay objetivos definidos'}
          </p>
          <Button variant="outline" onClick={addModuleBlock} className="rounded-none font-mono text-[10px] uppercase h-9">
            <Plus className="w-3.5 h-3.5 mr-2" />
            {t('addModule') || 'Añadir Módulo'}
          </Button>
        </div>
      )}

      {objectives.map((group, gi) => (
        <div key={gi} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Input
              value={group.module}
              onChange={(e) => updateModuleBlock(gi, 'module', e.target.value)}
              placeholder="Módulo (ej: M1)"
              className="w-24 rounded-none font-mono text-xs h-9"
            />
            <span className="text-muted-foreground font-mono text-xs">Bloque</span>
            <Input
              value={group.block}
              onChange={(e) => updateModuleBlock(gi, 'block', e.target.value)}
              placeholder="(ej: 1)"
              className="w-20 rounded-none font-mono text-xs h-9"
            />
            <span className="text-xs text-muted-foreground font-mono">
              {group.objectives.length} objetivo(s)
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none ml-auto hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removeModuleBlock(gi)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 ml-2">
            {group.objectives.map((obj, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground w-6 shrink-0 text-right">
                  {oi + 1}.
                </span>
                <Input
                  value={obj}
                  onChange={(e) => updateObjective(gi, oi, e.target.value)}
                  placeholder="Texto del objetivo de aprendizaje"
                  className="flex-1 rounded-none font-mono text-xs h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-none shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeObjective(gi, oi)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="self-start rounded-none font-mono text-[10px] uppercase h-7 mt-1"
              onClick={() => addObjective(gi)}
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('addObjective') || 'Añadir objetivo'}
            </Button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={addModuleBlock} className="rounded-none font-mono text-[10px] uppercase h-10">
          <Plus className="w-3.5 h-3.5 mr-2" />
          {t('addModuleBlock') || 'Añadir Módulo · Bloque'}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="rounded-none font-mono text-[10px] uppercase h-10 ml-auto">
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
          {saving ? (t('btnSaving') || 'Guardando...') : (t('btnSaveChanges') || 'Guardar Currículum')}
        </Button>
      </div>
    </div>
  );
}
