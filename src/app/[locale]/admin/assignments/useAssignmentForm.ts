'use client';

/**
 * @purpose Gestiona la lógica de forma para crear y actualizar asignaciones de exámenes en la aplicación ABDQuiz.
 * @purpose_en Manages the form logic for creating and updating exam assignments in the ABDQuiz application.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:7,sig:wrkkje
 * @lastUpdated 2026-06-23T16:48:33.886Z
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type SerializedExamAssignment } from '@/actions/examAssignment';
import { createAssignmentAction, updateAssignmentAction } from '@/actions/examAssignment';
import { getExamConfigsAction } from '@/actions/examConfig';

export interface ExamConfigOption {
  _id: string;
  name: string;
}

interface FormData {
  examConfigId: string;
  assignedToType: 'group' | 'user' | 'space';
  assignedToId: string;
  startDate: string;
  endDate: string;
  maxAttempts: string;
}

function getInitialFormData(editingAssignment: SerializedExamAssignment | null): FormData {
  if (editingAssignment) {
    return {
      examConfigId: editingAssignment.examConfigId,
      assignedToType: editingAssignment.assignedToType,
      assignedToId: editingAssignment.assignedToId,
      startDate: editingAssignment.startDate.slice(0, 16),
      endDate: editingAssignment.endDate.slice(0, 16),
      maxAttempts: String(editingAssignment.maxAttempts),
    };
  }
  return {
    examConfigId: '',
    assignedToType: 'space' as const,
    assignedToId: '',
    startDate: '',
    endDate: '',
    maxAttempts: '0',
  };
}

export function useAssignmentForm(editingAssignment: SerializedExamAssignment | null, open: boolean, onClose: () => void) {
  const router = useRouter();
  const t = useTranslations('admin');
  const [creating, setCreating] = useState(false);
  const [examConfigs, setExamConfigs] = useState<ExamConfigOption[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const formKey = useMemo(() => `form-${editingAssignment?._id || 'new'}-${open}`, [editingAssignment, open]);
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(editingAssignment));

  const isEditingPublished = editingAssignment?.status === 'published';

  // Load exam configs when dialog opens
  if (open && examConfigs.length === 0 && !loadingConfigs) {
    setLoadingConfigs(true);
    getExamConfigsAction()
      .then((configs) => {
        setExamConfigs(configs.map((c) => ({ _id: c._id, name: c.name })));
        setLoadingConfigs(false);
      })
      .catch(() => {
        toast.error(t('assignmentCreateError'));
        setLoadingConfigs(false);
      });
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.examConfigId) errors.examConfigId = t('validationRequired');
    if (!formData.assignedToId) errors.assignedToId = t('validationRequired');
    if (!formData.startDate) errors.startDate = t('validationRequired');
    if (!formData.endDate) errors.endDate = t('validationRequired');
    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      errors.endDate = t('validationInvalidDates');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setCreating(true);
    try {
      if (editingAssignment) {
        const res = await updateAssignmentAction(editingAssignment._id, {
          examConfigId: formData.examConfigId,
          assignedToType: formData.assignedToType,
          assignedToId: formData.assignedToId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          maxAttempts: parseInt(formData.maxAttempts, 10) || 0,
        });
        if (res.success) {
          toast.success(t('assignmentUpdated'));
          onClose();
          router.refresh();
        } else {
          toast.error(res.error || t('assignmentUpdateError'));
        }
      } else {
        const res = await createAssignmentAction({
          examConfigId: formData.examConfigId,
          assignedToType: formData.assignedToType,
          assignedToId: formData.assignedToId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          maxAttempts: parseInt(formData.maxAttempts, 10) || 0,
        });
        if (res.success) {
          toast.success(t('assignmentCreated'));
          onClose();
          router.refresh();
        } else {
          toast.error(res.error || t('assignmentCreateError'));
        }
      }
    } catch {
      toast.error(editingAssignment ? t('assignmentUpdateError') : t('assignmentCreateError'));
    } finally {
      setCreating(false);
    }
  };

  return {
    formKey,
    formData,
    setFormData,
    formErrors,
    examConfigs,
    loadingConfigs,
    creating,
    isEditingPublished,
    handleSubmit,
  };
}
