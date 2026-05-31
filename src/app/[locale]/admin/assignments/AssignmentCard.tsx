'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Archive, Trash2, Play, Users, User, Pencil, History, ChevronDown, ChevronUp } from 'lucide-react';
import { type SerializedExamAssignment, type SerializedAuditEntry } from '@/actions/examAssignment';

interface AssignmentCardProps {
  assignment: SerializedExamAssignment;
  locale: string;
  tenantId: string | null;
  onEdit: (a: SerializedExamAssignment) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Formato de fecha legible */
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

/** Determina si está vigente */
function isActiveWindow(start: string, end: string): boolean {
  const now = new Date();
  return new Date(start) <= now && now <= new Date(end);
}

const ASSIGNED_TO_ICONS: Record<string, React.ReactNode> = {
  space: <Users className="w-3.5 h-3.5" aria-hidden="true" />,
  group: <Users className="w-3.5 h-3.5" aria-hidden="true" />,
  user: <User className="w-3.5 h-3.5" aria-hidden="true" />,
};

export default function AssignmentCard({ assignment, locale, tenantId, onEdit, onPublish, onArchive, onDelete }: AssignmentCardProps) {
  const t = useTranslations('admin');
  const a = assignment;
  const active = a.status === 'published' && isActiveWindow(a.startDate, a.endDate);
  const [expandedAudit, setExpandedAudit] = useState(false);

  const auditActionLabel = (entry: SerializedAuditEntry): string => {
    const actionKey = entry.action.replace('QUIZ_ASSIGNMENT_', '');
    return t(`auditLogAction_${actionKey}` as 'auditLogAction_CREATE') || entry.action;
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
    <Card
      className={`group relative bg-card/40 border-white/5 hover:border-primary/40 transition-all duration-500 rounded-none p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 ${active ? 'border-l-2 border-l-green-500/50' : ''}`}
    >
      {/* Left: Icon + Info */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="p-3 bg-white/[0.02] border border-border group-hover:border-primary/30 transition-all shrink-0">
          {ASSIGNED_TO_ICONS[a.assignedToType] || <Users className="w-5 h-5 text-muted-foreground" aria-hidden="true" />}
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
              <Calendar className="w-3 h-3" aria-hidden="true" />
              {formatDate(a.startDate)} → {formatDate(a.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
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
          onClick={() => onEdit(a)}
          title={t('editAssignment')}
          aria-label={t('editAssignment')}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </Button>
        {a.status === 'draft' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-green-500/10 hover:text-green-400"
            onClick={() => onPublish(a._id)}
            title={t('publishAssignment')}
            aria-label={t('publishAssignment')}
          >
            <Play className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
        {a.status === 'published' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-yellow-500/10 hover:text-yellow-400"
            onClick={() => onArchive(a._id)}
            title={t('archiveAssignment')}
            aria-label={t('archiveAssignment')}
          >
            <Archive className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
        {a.status !== 'archived' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(a._id)}
            title={t('deleteAssignment')}
            aria-label={t('deleteAssignment')}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Audit Log Toggle & Content */}
      <div className="w-full mt-4 border-t border-border/30 pt-3">
        <button
          onClick={() => setExpandedAudit(!expandedAudit)}
          aria-label={`${t('auditLog')} ${a.examConfigName || ''}`}
          aria-expanded={expandedAudit}
          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <History className="w-3 h-3" aria-hidden="true" />
          {t('auditLog')}
          {expandedAudit ? (
            <ChevronUp className="w-3 h-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3 h-3" aria-hidden="true" />
          )}
        </button>

        {expandedAudit && (
          <div className="mt-3 space-y-1.5">
            {a.auditTrail.length === 0 ? (
              <p className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
                {t('auditLogEmpty')}
              </p>
            ) : (
              [...a.auditTrail].reverse().map((entry, i) => (
                <div key={i} className="flex items-start gap-3 text-[9px] font-mono text-muted-foreground/60">
              <AuditDot />
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
}

function AuditDot() {
  return <span className="shrink-0 w-1 h-1 rounded-full bg-primary/30 mt-1.5" aria-hidden="true" />;
}
