'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import { type SerializedCourse } from '@/actions/course';
import { toggleCourseActiveAction, deleteCourseAction } from '@/actions/course';
import { toast } from 'sonner';
import { ConfirmDialog } from '@ajabadia/ecosystem-widgets';
import CourseCard from './CourseCard';
import CourseFormModal from './CourseFormModal';

interface CoursesListProps {
  courses: SerializedCourse[];
  locale: string;
  showCreateForm?: boolean;
}

export default function CoursesList({ courses, locale, showCreateForm }: CoursesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('admin');

  // --- Create / Edit Modal State ---
  const [showCreate, setShowCreate] = useState(showCreateForm || false);
  const [editingCourse, setEditingCourse] = useState<SerializedCourse | null>(null);

  // --- Confirm Dialog State ---
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCourse(null);
    setShowCreate(true);
  };

  const openEditModal = (c: SerializedCourse) => {
    setEditingCourse(c);
    setShowCreate(true);
  };

  const closeModal = () => {
    setShowCreate(false);
    setEditingCourse(null);
  };

  const handleToggleActive = async () => {
    if (!toggleId) return;
    const id = toggleId;
    setToggleId(null);
    const res = await toggleCourseActiveAction(id);
    if (res.success) {
      toast.success(res.active ? t('courseActivated') : t('courseDeactivated'));
      router.refresh();
    } else {
      toast.error(res.error || t('courseToggleError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const res = await deleteCourseAction(id);
    if (res.success) {
      toast.success(t('courseDeleted'));
      router.refresh();
    } else {
      toast.error(res.error || t('courseDeleteError'));
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
          aria-label={t('newCourse')}
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          {t('newCourse')}
        </Button>
      </div>

      {/* List or Empty State */}
      {courses.length === 0 ? (
        <Card className="p-20 bg-card/10 border-dashed border-white/5 flex flex-col items-center justify-center text-center gap-4 rounded-none">
          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            {t('noCourses')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {courses.map((c) => (
            <CourseCard
              key={c._id}
              course={c}
              t={t}
              onEdit={openEditModal}
              onToggle={setToggleId}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Toggle Active Confirm */}
      <ConfirmDialog
        open={!!toggleId}
        onCancel={() => setToggleId(null)}
        onConfirm={handleToggleActive}
        title={courses.find((c) => c._id === toggleId)?.active ? t('deactivateCourseTitle') : t('activateCourseTitle')}
        message={
          courses.find((c) => c._id === toggleId)?.active
            ? t('deactivateCourseMessage')
            : t('activateCourseMessage')
        }
        confirmLabel={t('btnConfirm')}
        cancelLabel={t('btnCancel')}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('deleteCourseTitle')}
        message={t('deleteCourseMessage')}
        confirmLabel={t('btnDelete')}
        cancelLabel={t('btnCancel')}
      />

      {/* Create / Edit Course Modal */}
      <CourseFormModal
        open={showCreate}
        editingCourse={editingCourse}
        onClose={closeModal}
      />
    </div>
  );
}
