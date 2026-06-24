'use client';

/**
 * @purpose Gestiona el rendimiento y la funcionalidad de un diálogo modal para crear o editar cursos, incluyendo validación de formularios y envío.
 * @purpose_en Manages the rendering and functionality of a modal dialog for creating or editing courses, including form validation and submission.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:13,sig:1x33nzw
 * @lastUpdated 2026-06-23T16:48:56.259Z
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LabeledField } from '@ajabadia/styles';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Plus, Loader2, Pencil } from 'lucide-react';
import { useId } from 'react';
import { type SerializedCourse } from '@/actions/course';
import { createCourseAction, updateCourseAction } from '@/actions/course';
import { toast } from 'sonner';

interface CourseFormModalProps {
  open: boolean;
  editingCourse: SerializedCourse | null;
  onClose: () => void;
}

const initialFormData = {
  spaceId: '',
  name: '',
  description: '',
  tags: '',
};

export default function CourseFormModal({ open, editingCourse, onClose }: CourseFormModalProps) {
  const router = useRouter();
  const t = useTranslations('admin');
  const formId = useId();

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize form when opening with a course to edit
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      return;
    }
    if (editingCourse) {
      setFormData({
        spaceId: editingCourse.spaceId,
        name: editingCourse.name,
        description: editingCourse.description || '',
        tags: editingCourse.tags.join(', '),
      });
    } else {
      setFormData(initialFormData);
    }
    setFormErrors({});
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
          toast.success(t('courseUpdated'));
          onClose();
          router.refresh();
        } else {
          toast.error(res.error || t('courseUpdateError'));
        }
      } else {
        const res = await createCourseAction({
          spaceId: formData.spaceId,
          name: formData.name,
          description: formData.description,
          tags,
        });
        if (res.success) {
          toast.success(t('courseCreated'));
          onClose();
          router.refresh();
        } else {
          toast.error(res.error || t('courseCreateError'));
        }
      }
    } catch {
      toast.error(editingCourse ? t('courseUpdateError') : t('courseCreateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-none p-0 gap-0 bg-popover border border-border" showCloseButton={false}>
        {/* Header */}
        <div className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/[0.03] border border-border">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
                {editingCourse ? t('editCourseTitle') : t('newCourseTitle')}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Space ID */}
          <LabeledField
            id={`${formId}-spaceId`}
            label={t('spaceIdLabel')}
            required
            error={formErrors.spaceId}
            labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            <Input
              value={formData.spaceId}
              onChange={(e) => setFormData({ ...formData, spaceId: e.target.value })}
              placeholder="space-xxx-xxx"
              className={`rounded-none font-mono text-xs h-9 ${formErrors.spaceId ? 'border-destructive' : ''}`}
            />
          </LabeledField>

          {/* Name */}
          <LabeledField
            id={`${formId}-name`}
            label={t('courseNameLabel')}
            required
            error={formErrors.name}
            labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('courseNamePlaceholder')}
              className={`rounded-none font-mono text-xs h-9 ${formErrors.name ? 'border-destructive' : ''}`}
            />
          </LabeledField>

          {/* Description */}
          <LabeledField
            id={`${formId}-description`}
            label={<>{t('descriptionLabel')} <span className="text-muted-foreground/40 text-[8px]">{t('optional')}</span></>}
            labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            <textarea
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              className="w-full bg-transparent border border-border rounded-none px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors min-h-[80px] resize-y"
            />
          </LabeledField>

          {/* Tags */}
          <LabeledField
            id={`${formId}-tags`}
            label={<>{t('tagsLabel')} <span className="text-muted-foreground/40 text-[8px]">{t('tagsSeparatorHint')}</span></>}
            labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder={t('tagsPlaceholder')}
              className="rounded-none font-mono text-xs h-9"
            />
          </LabeledField>
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            className="rounded-none font-mono text-[10px] tracking-widest uppercase h-9 px-5"
            onClick={onClose}
            disabled={saving}
          >
            {t('btnCancel')}
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
                {t('btnSaving')}
              </>
            ) : editingCourse ? (
              <>
                <Pencil className="w-3.5 h-3.5 mr-2" />
                {t('btnSaveChanges')}
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-2" />
                {t('btnCreateCourse')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
