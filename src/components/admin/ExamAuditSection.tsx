'use client';

/**
 * @purpose Renderiza una sección administrativa para auditorías de exámenes, mostrando cobertura y proporcionando un panel para visualizar información de auditoría detallada.
 * @purpose_en Renders an administrative section for auditing exam reports, displaying coverage and providing a panel to view detailed audit information.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:wxjmu0
 * @lastUpdated 2026-06-24T10:32:44.243Z
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { ExamAuditReport } from '@/services/quiz/ExamAuditorService';
import ExamAuditPanel from './ExamAuditPanel';

interface ExamAuditSectionProps {
  report: ExamAuditReport | null;
  examName: string;
  courseId?: string;
  locale: string;
  tenantSuffix?: string;
}

export default function ExamAuditSection({ report, examName, courseId, locale, tenantSuffix }: ExamAuditSectionProps) {
  const t = useTranslations('admin');
  const [open, setOpen] = useState(false);

  if (report === null) {
    const msg = courseId
      ? (t('auditCourseNoObjectives') || 'El curso vinculado no tiene objetivos curriculares.')
      : (t('auditNoCurriculum') || 'Este examen no está vinculado a ningún curso.');
    const href = courseId
      ? `/${locale}/admin/courses/${courseId}/curriculum${tenantSuffix || ''}`
      : `/${locale}/admin/courses${tenantSuffix || ''}`;
    const linkText = courseId
      ? (t('auditAddObjectives') || 'Añadir objetivos')
      : (t('auditGoToCourses') || 'Gestionar cursos');

    return (
      <div className="w-full max-w-4xl mx-auto bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0" />
          <div className="text-sm text-slate-400">
            {msg}
            <a
              href={href}
              className="ml-2 text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {linkText}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 hover:bg-slate-900/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-200">
            {t('auditCoverageTitle') || 'Cobertura Curricular'}
          </span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            report.coveragePercentage >= 80 ? 'bg-emerald-950/60 text-emerald-400' :
            report.coveragePercentage >= 50 ? 'bg-amber-950/60 text-amber-400' :
            'bg-red-950/60 text-red-400'
          }`}>
            {report.coveragePercentage}%
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4">
          <ExamAuditPanel report={report} />
        </div>
      )}
    </div>
  );
}