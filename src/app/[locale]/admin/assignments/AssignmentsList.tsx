'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { type SerializedExamAssignment } from '@/actions/examAssignment';
import { publishAssignmentAction, archiveAssignmentAction, deleteAssignmentAction } from '@/actions/examAssignment';
import { toast } from 'sonner';
import { ConfirmDialog } from '@ajabadia/ecosystem-widgets';
import AssignmentCard from './AssignmentCard';
import AssignmentFormModal from './AssignmentFormModal';

interface AssignmentsListProps {
  assignments: SerializedExamAssignment[];
  locale: string;
  showCreateForm?: boolean;
}

export default function AssignmentsList({ assignments, locale, showCreateForm }: AssignmentsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('admin');
  const tenantId = searchParams.get('tenantId');

  // --- Filter State ---
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

  // --- Modal State ---
  const [showCreate, setShowCreate] = useState(showCreateForm || false);
  const [editingAssignment, setEditingAssignment] = useState<SerializedExamAssignment | null>(null);

  const openCreateModal = () => {
    setEditingAssignment(null);
    setShowCreate(true);
  };

  const openEditModal = (a: SerializedExamAssignment) => {
    setEditingAssignment(a);
    setShowCreate(true);
  };

  const closeModal = () => {
    setShowCreate(false);
    setEditingAssignment(null);
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
    if (res.success) toast.success(t('assignmentPublished'));
    else toast.error(res.error || t('assignmentPublishError'));
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    const id = archiveId;
    setArchiveId(null);
    const res = await archiveAssignmentAction(id);
    if (res.success) toast.success(t('assignmentArchived'));
    else toast.error(res.error || t('assignmentArchiveError'));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const res = await deleteAssignmentAction(id);
    if (res.success) toast.success(t('assignmentDeleted'));
    else toast.error(res.error || t('assignmentDeleteError'));
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
              aria-label={t('assignmentFilterAll')}
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
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          {t('newAssignment')}
        </Button>
      </div>

      {/* List or Empty State */}
      {filteredAssignments.length === 0 ? (
        <Card className="p-20 bg-card/10 border-dashed border-white/5 flex flex-col items-center justify-center text-center gap-4 rounded-none">
          <Calendar className="w-12 h-12 text-muted-foreground/30" aria-hidden="true" />
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">{t('noAssignments')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssignments.map((a) => (
            <AssignmentCard
              key={a._id}
              assignment={a}
              locale={locale}
              tenantId={tenantId}
              onEdit={openEditModal}
              onPublish={setPublishId}
              onArchive={setArchiveId}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!publishId}
        onCancel={() => setPublishId(null)}
        onConfirm={handlePublish}
        title={t('publishConfirmTitle')}
        message={t('publishConfirmMessage')}
        confirmLabel={t('publishAssignment')}
        cancelLabel={t('cancel')}
      />
      <ConfirmDialog
        open={!!archiveId}
        onCancel={() => setArchiveId(null)}
        onConfirm={handleArchive}
        title={t('archiveConfirmTitle')}
        message={t('archiveConfirmMessage')}
        confirmLabel={t('archiveAssignment')}
        cancelLabel={t('cancel')}
      />
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
      <AssignmentFormModal
        key={`form-${editingAssignment?._id || 'new'}-${showCreate}`}
        open={showCreate}
        editingAssignment={editingAssignment}
        onClose={closeModal}
      />
    </div>
  );
}
