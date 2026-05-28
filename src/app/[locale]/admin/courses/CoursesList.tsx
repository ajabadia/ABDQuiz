'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Plus, Loader2, Pencil, Trash2, EyeOff, Eye, Tags } from 'lucide-react';
import { type SerializedCourse } from '@/actions/course';
import { createCourseAction, updateCourseAction, toggleCourseActiveAction, deleteCourseAction } from '@/actions/course';
import { toast } from 'sonner';
import { ConfirmDialog } from '@ajabadia/ecosystem-widgets';

interface CoursesListProps {
  courses: SerializedCourse[];
  locale: string;
  showCreateForm?: boolean;
}

/** Helper: formato de fecha legible */
function formatDate(iso: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Badge de estado activo/inactivo */
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-none font-mono text-[9px] uppercase tracking-widest ${
        active
          ? 'border-green-500/30 text-green-400'
          : 'border-gray-500/30 text-gray-400'
      }`}
    >
      {active ? 'ACTIVO' : 'INACTIVO'}
    </Badge>
  );
}

export default function CoursesList({ courses, locale, showCreateForm }: CoursesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('admin');
  const tenantId = searchParams.get('tenantId');

  // --- Create / Edit Modal State ---
  const [showCreate, setShowCreate] = useState(showCreateForm || false);
  const [editingCourse, setEditingCourse] = useState<SerializedCourse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    spaceId: '',
    name: '',
    description: '',
    tags: '',
  });

  // --- Confirm Dialog State ---
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({ spaceId: '', name: '', description: '', tags: '' });
    setFormErrors({});
    setShowCreate(true);
  };

  const openEditModal = (c: SerializedCourse) => {
    setEditingCourse(c);
    setFormData({
      spaceId: c.spaceId,
      name: c.name,
      description: c.description || '',
      tags: c.tags.join(', '),
    });
    setFormErrors({});
    setShowCreate(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = t('validationRequired');
    if (!formData.spaceId.trim()) errors.spaceId = t('validationRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingCourse) {
        const res = await updateCourseAction(editingCourse._id, {
          spaceId: formData.spaceId,
          name: formData.name,
          description: formData.description,
          tags,
        });
        if (res.success) {
          toast.success('Curso actualizado con éxito');
          setShowCreate(false);
          setEditingCourse(null);
          router.refresh();
        } else {
          toast.error(res.error || 'Error al actualizar el curso');
        }
      } else {
        const res = await createCourseAction({
          spaceId: formData.spaceId,
          name: formData.name,
          description: formData.description,
          tags,
        });
        if (res.success) {
          toast.success('Curso creado con éxito');
          setShowCreate(false);
          router.refresh();
        } else {
          toast.error(res.error || 'Error al crear el curso');
        }
      }
    } catch {
      toast.error(editingCourse ? 'Error al actualizar el curso' : 'Error al crear el curso');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleId) return;
    const id = toggleId;
    setToggleId(null);
    const res = await toggleCourseActiveAction(id);
    if (res.success) {
      toast.success(res.active ? 'Curso activado' : 'Curso desactivado');
      router.refresh();
    } else {
      toast.error(res.error || 'Error al cambiar estado del curso');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const res = await deleteCourseAction(id);
    if (res.success) {
      toast.success('Curso eliminado con éxito');
      router.refresh();
    } else {
      toast.error(res.error || 'Error al eliminar el curso');
    }
  };

  return (
    <div className="relative">

      {/* Header: Count + Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {courses.length} {t('coursesTitle')}
        </p>
        <Button
          variant="outline"
          className="rounded-none font-mono text-[10px] tracking-widest uppercase h-10 px-5 shrink-0"
          onClick={openCreateModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('newCourse')}
        </Button>
      </div>

      {/* List or Empty State */}
      {courses.length === 0 ? (
        <Card className="p-20 bg-card/10 border-dashed border-white/5 flex flex-col items-center justify-center text-center gap-4 rounded-none">
          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            NO SE DETECTARON CURSOS BAJO ESTOS PARÁMETROS
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {courses.map((c) => (
            <Card
              key={c._id}
              className="group relative bg-card/40 border-white/5 hover:border-primary/40 transition-all duration-500 rounded-none p-6 flex flex-col gap-4"
            >
              {/* Top Row: Icon + Info + Actions */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="p-3 bg-white/[0.02] border border-border group-hover:border-primary/30 transition-all shrink-0">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold tracking-tight uppercase italic group-hover:text-primary transition-colors truncate">
                      {c.name}
                    </h3>
                    <ActiveBadge active={c.active} />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex-wrap">
                    {c.description && (
                      <span className="text-muted-foreground/70 max-w-md truncate">
                        {c.description}
                      </span>
                    )}
                    <span>
                      Space: {c.spaceId.slice(-8)}
                    </span>
                    <span>
                      Creado: {formatDate(c.createdAt)}
                    </span>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Tags className="w-3 h-3 text-muted-foreground/40" />
                      {c.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono px-2 py-0.5 border border-border/40 text-muted-foreground/60 uppercase tracking-widest"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none hover:bg-primary/10 hover:text-primary"
                    onClick={() => openEditModal(c)}
                    title="Editar curso"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none hover:bg-yellow-500/10 hover:text-yellow-400"
                    onClick={() => setToggleId(c._id)}
                    title={c.active ? 'Desactivar curso' : 'Activar curso'}
                  >
                    {c.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteId(c._id)}
                    title="Eliminar curso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Toggle Active Confirm */}
      <ConfirmDialog
        open={!!toggleId}
        onCancel={() => setToggleId(null)}
        onConfirm={handleToggleActive}
        title={courses.find((c) => c._id === toggleId)?.active ? 'DESACTIVAR CURSO' : 'ACTIVAR CURSO'}
        message={
          courses.find((c) => c._id === toggleId)?.active
            ? '¿Estás seguro de que deseas desactivar este curso? Los exámenes asociados podrían verse afectados.'
            : '¿Estás seguro de que deseas reactivar este curso?'
        }
        confirmLabel="CONFIRMAR"
        cancelLabel="CANCELAR"
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="ELIMINAR CURSO"
        message="¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer."
        confirmLabel="ELIMINAR"
        cancelLabel="CANCELAR"
      />

      {/* Create / Edit Course Modal */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setEditingCourse(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-none p-0 gap-0 bg-popover border border-border" showCloseButton={false}>
          {/* Header */}
          <div className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/[0.03] border border-border">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
                  {editingCourse ? 'EDITAR CURSO' : 'NUEVO CURSO'}
                </DialogTitle>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Space ID */}
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                ID del Espacio <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.spaceId}
                onChange={(e) => setFormData({ ...formData, spaceId: e.target.value })}
                placeholder="space-xxx-xxx"
                className={`rounded-none font-mono text-xs h-9 ${formErrors.spaceId ? 'border-destructive' : ''}`}
              />
              {formErrors.spaceId && (
                <p className="text-[10px] font-mono text-destructive mt-1">{formErrors.spaceId}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                Nombre del Curso <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Fundamentos de Redes"
                className={`rounded-none font-mono text-xs h-9 ${formErrors.name ? 'border-destructive' : ''}`}
              />
              {formErrors.name && (
                <p className="text-[10px] font-mono text-destructive mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Descripción <span className="text-muted-foreground/40 text-[8px]">{t('optional')}</span>
              </Label>
              <textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descripción del curso..."
                className="w-full bg-transparent border border-border rounded-none px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors min-h-[80px] resize-y"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Etiquetas <span className="text-muted-foreground/40 text-[8px]">{t('tagsSeparatorHint')}</span>
              </Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="redes, seguridad, básico"
                className="rounded-none font-mono text-xs h-9"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 px-6 py-4 flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              className="rounded-none font-mono text-[10px] tracking-widest uppercase h-9 px-5"
              onClick={() => setShowCreate(false)}
              disabled={saving}
            >
              CANCELAR
            </Button>
            <Button
              variant="default"
              className="rounded-none font-mono text-[10px] tracking-widest uppercase h-9 px-5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  GUARDANDO...
                </>
              ) : editingCourse ? (
                <>
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  GUARDAR CAMBIOS
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  CREAR CURSO
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
