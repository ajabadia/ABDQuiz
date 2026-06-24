'use client';

/**
 * @purpose Renders a un componente de tarjeta para mostrar y gestionar cursos, incluyendo acciones como editar, activar o desactivar el estado y eliminar.
 * @purpose_en Renders a card component for displaying and managing courses, including actions like editing, toggling active status, and deleting.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:6,sig:x8y7cd
 * @lastUpdated 2026-06-24T08:20:42.807Z
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Pencil, EyeOff, Eye, Trash2, Tags, ClipboardList } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { type SerializedCourse } from '@/actions/course';

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
function ActiveBadge({ active, t }: { active: boolean; t: (key: string) => string }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-none font-mono text-[9px] uppercase tracking-widest ${
        active
          ? 'border-green-500/30 text-green-400'
          : 'border-gray-500/30 text-gray-400'
      }`}
    >
      {active ? t('courseActive') : t('courseInactive')}
    </Badge>
  );
}

interface CourseCardProps {
  course: SerializedCourse;
  t: (key: string) => string;
  locale?: string;
  onEdit: (course: SerializedCourse) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function CourseCard({ course, t, locale, onEdit, onToggle, onDelete }: CourseCardProps) {
  return (
    <Card
      className="group relative bg-card/40 border-white/5 hover:border-primary/40 transition-all duration-500 rounded-none p-6 flex flex-col gap-4"
    >
      {/* Top Row: Icon + Info + Actions */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-3 bg-white/[0.02] border border-border group-hover:border-primary/30 transition-all shrink-0">
          <BookOpen className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold tracking-tight uppercase italic group-hover:text-primary transition-colors truncate">
              {course.name}
            </h3>
            <ActiveBadge active={course.active} t={t} />
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex-wrap">
            {course.description && (
              <span className="text-muted-foreground/70 max-w-md truncate">
                {course.description}
              </span>
            )}
            <span>
              Space: {course.spaceId.slice(-8)}
            </span>
            <span>
              Creado: {formatDate(course.createdAt)}
            </span>
          </div>
          {course.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Tags className="w-3 h-3 text-muted-foreground/40" />
              {course.tags.map((tag, i) => (
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
            asChild
            title={t('curriculum') || 'Currículum'}
            aria-label={t('curriculum') || 'Currículum'}
          >
            <Link href={`/${locale || 'es'}/admin/courses/${course._id}/curriculum`}>
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-primary/10 hover:text-primary"
            onClick={() => onEdit(course)}
            title={t('editCourse')}
            aria-label={t('editCourse')}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-yellow-500/10 hover:text-yellow-400"
            onClick={() => onToggle(course._id)}
            title={course.active ? t('deactivateCourse') : t('activateCourse')}
            aria-label={course.active ? t('deactivateCourse') : t('activateCourse')}
          >
            {course.active ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(course._id)}
            title={t('deleteCourse')}
            aria-label={t('deleteCourse')}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
