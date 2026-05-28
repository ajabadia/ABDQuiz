'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Archive, Trash2, Play, Users, User, Plus, Loader2, Pencil, Lock, History, ChevronDown, ChevronUp } from 'lucide-react';
import { type SerializedExamAssignment, type SerializedAuditEntry } from '@/actions/examAssignment';
import { createAssignmentAction, updateAssignmentAction, publishAssignmentAction, archiveAssignmentAction, deleteAssignmentAction } from '@/actions/examAssignment';
import { getExamConfigsAction } from '@/actions/examConfig';
import { toast } from 'sonner';
import { ConfirmDialog } from '@ajabadia/ecosystem-widgets';

interface ExamConfigOption {
  _id: string;
  name: string;
}

interface AssignmentsListProps {
  assignments: SerializedExamAssignment[];
  locale: string;
  showCreateForm?: boolean;
}

/** Helper: formato de fecha legible */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Helper: determina si está vigente */
function isActiveWindow(start: string, end: string): boolean {
  const now = new Date();
  return new Date(start) <= now && now <= new Date(end);
}

const ASSIGNED_TO_ICONS: Record<string, React.ReactNode> = {
  space: <Users className="w-3.5 h-3.5" />,
  group: <Users className="w-3.5 h-3.5" />,
  user: <User className="w-3.5 h-3.5" />,
};

export default function AssignmentsList({ assignments, locale, showCreateForm }: AssignmentsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('admin');
  const tenantId = searchParams.get('tenantId');

  // --- Filter State ──────────────────────────────
  const [filterExamConfigId, setFilterExamConfigId] = useState('');

  const configOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) {
      if (a.examConfigId && !map.has(a.examConfigId)) {
        map.set(a.examConfigId, a.examConfigName || a.examConfigId.slice(-8));
      }
    }
    return Array.from(map.entries()).map(([_id, name]) => ({ _id, name }));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    if (!filterExamConfigId) return assignments;
    return assignments.filter((a) => a.examConfigId === filterExamConfigId);
  }, [assignments, filterExamConfigId]);

  // --- Create / Edit Assignment Modal State ---
  const [showCreate, setShowCreate] = useState(showCreateForm || false);
  const [editingAssignment, setEditingAssignment] = useState<SerializedExamAssignment | null>(null);
  const [creating, setCreating] = useState(false);
  const [examConfigs, setExamConfigs] = useState<ExamConfigOption[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(!!showCreateForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    examConfigId: '',
    assignedToType: 'space' as 'group' | 'user' | 'space',
    assignedToId: '',
    startDate: '',
    endDate: '',
    maxAttempts: '0',
  });

  // --- Audit Log State ---
  const [expandedAudit, setExpandedAudit] = useState<Set<string>>(new Set());

  const toggleAudit = (id: string) => {
    setExpandedAudit((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const auditActionLabel = (entry: SerializedAuditEntry): string => {
    const actionKey = entry.action.replace('QUIZ_ASSIGNMENT_', '');
    return t(`auditLogAction_${actionKey}` as 'auditLogAction_CREATE') || entry.action;
  };

  const isEditingPublished = editingAssignment?.status === 'published';

  // Reemplazada por lógica inline en useEffect

  useEffect(() => {
    if (!showCreate) return;
    getExamConfigsAction()
      .then((configs) => {
        setExamConfigs(configs.map((c) => ({ _id: c._id, name: c.name })));
        setLoadingConfigs(false);
      })
      .catch(() => {
        toast.error(t('assignmentCreateError'));
        setLoadingConfigs(false);
      });
  }, [showCreate, t]);

  const openCreateModal = () => {
    setEditingAssignment(null);
    setFormData({
      examConfigId: '',
      assignedToType: 'space',
      assignedToId: '',
      startDate: '',
      endDate: '',
      maxAttempts: '0',
    });
    setFormErrors({});
    setShowCreate(true);
    setLoadingConfigs(true);
  };

  const openEditModal = (a: SerializedExamAssignment) => {
    setEditingAssignment(a);
    setFormData({
      examConfigId: a.examConfigId,
      assignedToType: a.assignedToType,
      assignedToId: a.assignedToId,
      startDate: a.startDate.slice(0, 16),
      endDate: a.endDate.slice(0, 16),
      maxAttempts: String(a.maxAttempts),
    });
    setFormErrors({});
    setShowCreate(true);
    setLoadingConfigs(true);
  };

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

  const handleCreate = async () => {
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
          setShowCreate(false);
          setEditingAssignment(null);
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
          setShowCreate(false);
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

  // --- Confirm Dialog State ---
  const [publishId, setPublishId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!publishId) return;
    const id = publishId;
    setPublishId(null);
    const res = await publishAssignmentAction(id);
    if (res.success) {
      toast.success(t('assignmentPublished'));
    } else {
      toast.error(res.error || t('assignmentPublishError'));
    }
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    const id = archiveId;
    setArchiveId(null);
    const res = await archiveAssignmentAction(id);
    if (res.success) {
      toast.success(t('assignmentArchived'));
    } else {
      toast.error(res.error || t('assignmentArchiveError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const res = await deleteAssignmentAction(id);
    if (res.success) {
      toast.success(t('assignmentDeleted'));
    } else {
      toast.error(res.error || t('assignmentDeleteError'));
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'border-yellow-500/30 text-yellow-400',
      published: 'border-green-500/30 text-green-400',
      archived: 'border-gray-500/30 text-gray-400',
    };
    return (
      <Badge variant="outline" className={`rounded-none font-mono text-[9px] uppercase tracking-widest ${colors[status] || ''}`}>
        {status === 'draft' ? t('statusDraft') : status === 'published' ? t('statusPublished') : t('statusArchived')}
      </Badge>
    );
  };

  return (
    <div className="relative">

      {/* Header: Count + Filter + Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            {filterExamConfigId
              ? t('assignmentFilteredCount', { filtered: filteredAssignments.length, total: assignments.length })
              : `${assignments.length} ${t('assignmentsTitle')}`}
          </p>
          {configOptions.length > 1 && (
            <select
              value={filterExamConfigId}
              onChange={(e) => setFilterExamConfigId(e.target.value)}
              className="h-8 max-w-[220px] bg-transparent border border-border rounded-none px-2.5 text-[10px] font-mono text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer uppercase tracking-widest"
            >
              <option value="">{t('assignmentFilterAll')}</option>
              {configOptions.map((cfg) => (
                <option key={cfg._id} value={cfg._id} className="bg-popover text-foreground font-mono text-[10px]">
                  {cfg.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button
          variant="outline"
          className="rounded-none font-mono text-[10px] tracking-widest uppercase h-10 px-5 shrink-0"
          onClick={openCreateModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('newAssignment')}
        </Button>
      </div>

      {/* List or Empty State */}
      {filteredAssignments.length === 0 ? (
        <Card className="p-20 bg-card/10 border-dashed border-white/5 flex flex-col items-center justify-center text-center gap-4 rounded-none">
          <Calendar className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">{t('noAssignments')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssignments.map((a) => {
            const active = a.status === 'published' && isActiveWindow(a.startDate, a.endDate);
            return (
              <Card
                key={a._id}
                className={`group relative bg-card/40 border-white/5 hover:border-primary/40 transition-all duration-500 rounded-none p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 ${active ? 'border-l-2 border-l-green-500/50' : ''}`}
              >
                {/* Left: Icon + Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="p-3 bg-white/[0.02] border border-border group-hover:border-primary/30 transition-all shrink-0">
                    {ASSIGNED_TO_ICONS[a.assignedToType] || <Users className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        href={`/${locale}/admin/exams/${a.examConfigId}/edit${tenantId ? `?tenantId=${tenantId}` : ''}`}
                        className="group/link"
                      >
                        <h3 className="text-lg font-bold tracking-tight uppercase italic group-hover:text-primary transition-colors truncate cursor-pointer underline-offset-4 group-hover/link:underline">
                          {a.examConfigName || a.examConfigId.slice(-8) || t('unnamedConfig')}
                        </h3>
                      </Link>
                      {statusBadge(a.status)}
                      {active && (
                        <Badge variant="outline" className="rounded-none font-mono text-[9px] uppercase tracking-widest border-green-500/30 text-green-400">
                          {t('assignmentActive')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(a.startDate)} → {formatDate(a.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('assignmentMaxAttempts')}: {a.maxAttempts || '∞'}
                      </span>
                      <span>
                        {t('assignmentType')}: {a.assignedToType} / {a.assignedToId.slice(-8)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none hover:bg-primary/10 hover:text-primary"
                    onClick={() => openEditModal(a)}
                    title={t('editAssignment')}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {a.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-green-500/10 hover:text-green-400"
                      onClick={() => setPublishId(a._id)}
                      title={t('publishAssignment')}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {a.status === 'published' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-yellow-500/10 hover:text-yellow-400"
                      onClick={() => setArchiveId(a._id)}
                      title={t('archiveAssignment')}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                  {a.status !== 'archived' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteId(a._id)}
                      title={t('deleteAssignment')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Audit Log Toggle & Content */}
                <div className="w-full mt-4 border-t border-border/30 pt-3">
                  <button
                    onClick={() => toggleAudit(a._id)}
                    aria-label={`${t('auditLog')} ${a.examConfigName || ''}`}
                    className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <History className="w-3 h-3" />
                    {t('auditLog')}
                    {expandedAudit.has(a._id) ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {expandedAudit.has(a._id) && (
                    <div className="mt-3 space-y-1.5">
                      {a.auditTrail.length === 0 ? (
                        <p className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
                          {t('auditLogEmpty')}
                        </p>
                      ) : (
                        [...a.auditTrail].reverse().map((entry, i) => (
                          <div key={i} className="flex items-start gap-3 text-[9px] font-mono text-muted-foreground/60">
                            <span className="shrink-0 w-1 h-1 rounded-full bg-primary/30 mt-1.5"></span>
                            <span className="shrink-0 w-14 text-[8px] text-muted-foreground/40">
                              {new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="font-bold text-primary/60 uppercase tracking-widest">
                              {auditActionLabel(entry)}
                            </span>
                            {entry.details && (
                              <span className="text-muted-foreground/40 truncate">— {entry.details}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Publish Confirm */}
      <ConfirmDialog
        open={!!publishId}
        onCancel={() => setPublishId(null)}
        onConfirm={handlePublish}
        title={t('publishConfirmTitle')}
        message={t('publishConfirmMessage')}
        confirmLabel={t('publishAssignment')}
        cancelLabel={t('cancel')}
      />

      {/* Archive Confirm */}
      <ConfirmDialog
        open={!!archiveId}
        onCancel={() => setArchiveId(null)}
        onConfirm={handleArchive}
        title={t('archiveConfirmTitle')}
        message={t('archiveConfirmMessage')}
        confirmLabel={t('archiveAssignment')}
        cancelLabel={t('cancel')}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('deleteConfirmTitle')}
        message={t('deleteConfirmMessage')}
        confirmLabel={t('deleteAssignment')}
        cancelLabel={t('cancel')}
      />

      {/* Create / Edit Assignment Modal */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingAssignment(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-none p-0 gap-0 bg-popover border border-border" showCloseButton={false}>
          {/* Header */}
          <div className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/[0.03] border border-border">
                <Calendar className="w-4 h-4" />
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
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                {t('formExamConfig')} <span className="text-destructive">*</span>
                {isEditingPublished && <span title={t('publishedFieldLocked')}><Lock className="w-3 h-3 text-yellow-500/70" /></span>}
              </Label>
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
              {formErrors.examConfigId && (
                <p className="text-[10px] font-mono text-destructive mt-1">{formErrors.examConfigId}</p>
              )}
            </div>

            {/* Row: AssignedToType + AssignedToId */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  {t('formAssignedToType')} <span className="text-destructive">*</span>
                  {isEditingPublished && <span title={t('publishedFieldLocked')}><Lock className="w-3 h-3 text-yellow-500/70" /></span>}
                </Label>
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
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  {t('formAssignedToId')} <span className="text-destructive">*</span>
                  {isEditingPublished && <span title={t('publishedFieldLocked')}><Lock className="w-3 h-3 text-yellow-500/70" /></span>}
                </Label>
                <Input
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  placeholder="ID..."
                  disabled={isEditingPublished}
                  className={`rounded-none font-mono text-xs h-9 ${formErrors.assignedToId ? 'border-destructive' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}
                />
                {formErrors.assignedToId && (
                  <p className="text-[10px] font-mono text-destructive mt-1">{formErrors.assignedToId}</p>
                )}
              </div>
            </div>

            {/* Row: Start Date + End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t('formStartDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={`rounded-none font-mono text-xs h-9 ${formErrors.startDate ? 'border-destructive' : ''}`}
                />
                {formErrors.startDate && (
                  <p className="text-[10px] font-mono text-destructive mt-1">{formErrors.startDate}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t('formEndDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={`rounded-none font-mono text-xs h-9 ${formErrors.endDate ? 'border-destructive' : ''}`}
                />
                {formErrors.endDate && (
                  <p className="text-[10px] font-mono text-destructive mt-1">{formErrors.endDate}</p>
                )}
              </div>
            </div>

            {/* Max Attempts */}
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t('formMaxAttempts')} <span className="text-muted-foreground/40 text-[8px]">{t('optional')}</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
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
              disabled={creating}
            >
              {t('btnCancel')}
            </Button>
            <Button
              variant="default"
              className="rounded-none font-mono text-[10px] tracking-widest uppercase h-9 px-5"
              onClick={handleCreate}
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
    </div>
  );
}
