'use client';

/**
 * @purpose Renderiza el progreso del estudiante a nivel objetivo del currículum por curso.
 * @purpose_en Renders student progress at the curriculum objective level per course.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:2oik1i
 * @lastUpdated 2026-06-24T10:55:24.357Z
 */

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronDown, ChevronRight, Target, CheckCircle2, AlertCircle, CircleDot, Award, Loader2 } from 'lucide-react';
import type { CourseProgress } from '@/actions/course-progress';
import { generateCertificateAction, downloadCertificateAction } from '@/actions/certificate-actions';

interface CourseProgressSectionProps {
  courses: CourseProgress[];
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'mastered':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />;
    case 'in_progress':
      return <AlertCircle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />;
    default:
      return <CircleDot className="w-3.5 h-3.5 text-muted-foreground/40" aria-hidden="true" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'mastered':
      return 'bg-emerald-500/10 border-emerald-500/30';
    case 'in_progress':
      return 'bg-amber-500/10 border-amber-500/30';
    default:
      return 'bg-muted/10 border-border/30';
  }
}

export function CourseProgressSection({ courses }: CourseProgressSectionProps) {
  const d = useTranslations('dashboard');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [generatingCert, setGeneratingCert] = useState<Set<string>>(new Set());
  const [certStatus, setCertStatus] = useState<Record<string, 'idle' | 'loading' | 'ready' | 'error'>>({});
  const [certData, setCertData] = useState<Record<string, { certId: string }>>({});

  if (courses.length === 0) {
    return null;
  }

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleGenerate = useCallback(async (courseId: string) => {
    setCertStatus((prev) => ({ ...prev, [courseId]: 'loading' }));
    const result = await generateCertificateAction(courseId);
    if (result.success && result.data) {
      setCertData((prev) => ({ ...prev, [courseId]: { certId: result.data!.certId } }));
      setCertStatus((prev) => ({ ...prev, [courseId]: 'ready' }));
    } else {
      setCertStatus((prev) => ({ ...prev, [courseId]: 'error' }));
    }
  }, []);

  const handleDownload = useCallback(async (courseId: string) => {
    const entry = certData[courseId];
    if (!entry) return;
    const result = await downloadCertificateAction(entry.certId);
    if (result.success && result.data) {
      const byteChars = atob(result.data.pdfBase64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${result.data.courseName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [certData]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Target className="w-5 h-5 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">
          {d('courseProgress')}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground font-sans -mt-4">
        {d('courseProgressDesc')}
      </p>

      <div className="grid grid-cols-1 gap-4">
        {courses.map((course) => {
          const isExpanded = expandedCourses.has(course.courseId);
          const overallPct = course.totalObjectives > 0
            ? Math.round((course.coveredObjectives / course.totalObjectives) * 100)
            : 0;

          return (
            <Card
              key={course.courseId}
              className="p-5 bg-card/30 border-border rounded-none hover:border-primary/20 transition-all"
            >
              <button
                onClick={() => toggleCourse(course.courseId)}
                className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-bold font-mono uppercase tracking-tight truncate">
                    {course.courseName}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    {d('objectivesCount', { covered: course.coveredObjectives, total: course.totalObjectives })}
                  </span>
                  <div className="w-16 h-1.5 bg-muted/30 rounded-none overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-none"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-primary w-8 text-right">
                    {overallPct}%
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {course.objectives.map((obj) => (
                      <div
                        key={`${obj.module}-${obj.objectiveIndex}`}
                        className={`flex items-start gap-2.5 p-2.5 border rounded-none ${getStatusColor(obj.status)} transition-colors`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {getStatusIcon(obj.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground/60">
                              {obj.module}
                            </span>
                            {obj.totalQuestions > 0 && (
                              <span className="text-[8px] font-mono text-muted-foreground/40">
                                #{obj.objectiveIndex + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-sans text-foreground/80 leading-relaxed line-clamp-2">
                            {obj.objectiveText}
                          </p>
                          {obj.totalQuestions > 0 ? (
                            <p className="text-[9px] font-mono text-muted-foreground/60 mt-1">
                              {d('accuracyLabel', { correct: obj.correctCount, total: obj.totalQuestions })}
                              <span className="ml-1.5 text-primary">{obj.accuracy}%</span>
                            </p>
                          ) : (
                            <p className="text-[9px] font-mono text-muted-foreground/30 mt-1 italic">
                              {d('notStarted')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Certificate download — shown when all objectives are mastered */}
                  {course.objectives.length > 0 && course.objectives.every((o) => o.status === 'mastered') && (
                    <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-500 uppercase tracking-wider">
                        <Award className="w-3.5 h-3.5" />
                        {d('allMastered')}
                      </span>
                      <div className="flex gap-2">
                        {certStatus[course.courseId] === 'loading' && (
                          <Button
                            className="rounded-none font-mono text-[8px] tracking-widest uppercase h-8 px-3"
                            disabled
                          >
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            {d('downloadCertificate')}
                          </Button>
                        )}
                        {certStatus[course.courseId] === 'ready' && (
                          <Button
                            className="rounded-none font-mono text-[8px] tracking-widest uppercase h-8 px-3"
                            onClick={() => handleDownload(course.courseId)}
                          >
                            <Award className="w-3 h-3 mr-1" />
                            {d('downloadCertificate')}
                          </Button>
                        )}
                        {certStatus[course.courseId] !== 'loading' && certStatus[course.courseId] !== 'ready' && (
                          <Button
                            className="rounded-none font-mono text-[8px] tracking-widest uppercase h-8 px-3"
                            onClick={() => handleGenerate(course.courseId)}
                          >
                            <Award className="w-3 h-3 mr-1" />
                            {d('certificateGenerated')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
