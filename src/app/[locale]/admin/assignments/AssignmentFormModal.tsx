'use client';

/**
 * @purpose Renderiza una dialogo modal para crear o editar una tarea, incluyendo campos de formulario y botones.
 * @purpose_en Renders a modal dialog for creating or editing an assignment, including form fields and buttons.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:9,sig:w9o6ae
 * @lastUpdated 2026-06-23T19:47:56.177Z
 */

import { useTranslations } from 'next-intl';
import { LabeledField } from '@ajabadia/styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Pencil, Plus, Loader2, Lock } from 'lucide-react';
import { useId } from 'react';
import { type SerializedExamAssignment } from '@/actions/examAssignment';
import { useAssignmentForm } from './useAssignmentForm';

interface AssignmentFormModalProps {
  open: boolean;
  editingAssignment: SerializedExamAssignment | null;
  onClose: () => void;
}

export default function AssignmentFormModal({ open, editingAssignment, onClose }: AssignmentFormModalProps) {
  const t = useTranslations('admin');
  const formId = useId();
  const {
    formKey, formData, setFormData, formErrors,
    examConfigs, loadingConfigs, creating, isEditingPublished, handleSubmit,
  } = useAssignmentForm(editingAssignment, open, onClose);

  return (
    <Dialog key={formKey} open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg rounded-none p-0 gap-0 bg-popover border border-border" showCloseButton={false}>
        {/* Header */}
        <div className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/[0.03] border border-border">
              <Calendar className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
                {editingAssignment ? t('editAssignmentTitle') : t('createAssignment')}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Exam Config Select */}
            <LabeledField
              id={`${formId}-examConfig`}
              label={<>{t('formExamConfig')} {isEditingPublished && <span title={t('publishedFieldLocked')}><Lock className="w-3 h-3 text-yellow-500/70" aria-hidden="true" /></span>}</>}
              required
              error={formErrors.examConfigId}
              labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <select
                value={formData.examConfigId}
                onChange={(e) => setFormData({ ...formData, examConfigId: e.target.value })}
                disabled={isEditingPublished}
                className={`w-full h-9 bg-transparent border ${formErrors.examConfigId ? 'border-destructive' : 'border-border'} rounded-none px-3 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {loadingConfigs ? (
                  <option value="" disabled>{t('loadingConfigs')}</option>
                ) : (
                  <option value="" disabled>{t('formSelectExamConfig')}</option>
                )}
                {examConfigs.map((cfg) => (
                  <option key={cfg._id} value={cfg._id} className="bg-popover text-foreground font-mono text-xs">
                    {cfg.name}
                  </option>
                ))}
              </select>
            </LabeledField>

          {/* Row: AssignedToType + AssignedToId */}
          <div className="grid grid-cols-2 gap-4">
            <LabeledField
              id={`${formId}-assignedType`}
              label={<>{t('formAssignedToType')} {isEditingPublished && <span title={t('publishedFieldLocked')}><Lock className="w-3 h-3 text-yellow-500/70" aria-hidden="true" /></span>}</>}
              required
              labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <select
                value={formData.assignedToType}
                onChange={(e) => setFormData({ ...formData, assignedToType: e.target.value as 'group' | 'user' | 'space' })}
                disabled={isEditingPublished}
                className="w-full h-9 bg-transparent border border-border rounded-none px-3 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="space">{t('formAssignedToTypeSpace')}</option>
                <option value="group">{t('formAssignedToTypeGroup')}</option>
                <option value="user">{t('formAssignedToTypeUser')}</option>
              </select>
            </LabeledField>
            <LabeledField
              id={`${formId}-assignedId`}
              label={<>{t('formAssignedToId')} {isEditingPublished && <span title={t('publishedFieldLocked')}><Lock className="w-3 h-3 text-yellow-500/70" aria-hidden="true" /></span>}</>}
              required
              error={formErrors.assignedToId}
              labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <Input
                value={formData.assignedToId}
                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                placeholder="ID..."
                disabled={isEditingPublished}
                className={`rounded-none font-mono text-xs h-9 ${formErrors.assignedToId ? 'border-destructive' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
            </LabeledField>
          </div>

          {/* Row: Start Date + End Date */}
          <div className="grid grid-cols-2 gap-4">
            <LabeledField
              id={`${formId}-startDate`}
              label={t('formStartDate')}
              required
              error={formErrors.startDate}
              labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <Input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`rounded-none font-mono text-xs h-9 ${formErrors.startDate ? 'border-destructive' : ''}`}
              />
            </LabeledField>
            <LabeledField
              id={`${formId}-endDate`}
              label={t('formEndDate')}
              required
              error={formErrors.endDate}
              labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <Input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`rounded-none font-mono text-xs h-9 ${formErrors.endDate ? 'border-destructive' : ''}`}
              />
            </LabeledField>
          </div>

          {/* Max Attempts */}
            <LabeledField
              id={`${formId}-maxAttempts`}
              label={<>{t('formMaxAttempts')} <span className="text-muted-foreground/40 text-[8px]">{t('optional')}</span></>}
              labelClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <Input
                type="number"
                min={0}
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
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
            disabled={creating}
          >
            {t('btnCancel')}
          </Button>
          <Button
            variant="default"
            className="rounded-none font-mono text-[10px] tracking-widest uppercase h-9 px-5"
            onClick={handleSubmit}
            disabled={creating}
          >
            {creating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                {editingAssignment ? t('btnSave') : t('btnCreate')}
              </>
            ) : editingAssignment ? (
              <>
                <Pencil className="w-3.5 h-3.5 mr-2" />
                {t('btnSave')}
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-2" />
                {t('btnCreate')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
