/**
 * @purpose Gestiona y procesa datos de calificaciones para intentos de prueba, incluyendo la extracción de previsualizaciones de texto abierto y el cálculo de puntos básicos según la dificultad.
 * @purpose_en Manages and processes grading data for quiz attempts, including extracting open text previews and calculating base points based on difficulty.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:9,imports:0,sig:fwm804
 * @lastUpdated 2026-06-23T19:47:53.061Z
 */

export interface OpenTextPreviewItem {
  questionText: string;
  answerSnippet: string;
}

export interface SerializedGradingAttempt {
  _id: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: string;
  endedAt?: string;
  status: 'in_progress' | 'completed' | 'timeout';
  gradingStatus: 'auto_graded' | 'pending_manual_review' | 'manually_graded';
  gradedBy?: string;
  gradedAt?: string;
  examConfigId?: {
    _id: string;
    name: string;
    passThreshold: number;
  };
  openTextPreview?: OpenTextPreviewItem[];
}

export interface QuestionGradingData {
  questionIndex: number;
  manualPointsAwarded: number;
  feedback: string;
}

export interface AttemptDetailQuestion {
  questionIndex: number;
  questionText: string;
  type: 'multiple_choice' | 'open_text' | 'development';
  options: string[];
  correctOptionIndex: number;
  selectedOptionIndex?: number | null;
  manualTextAnswer?: string;
  attachmentUrl?: string;
  manualPointsAwarded?: number;
  feedback?: string;
  isCorrect: boolean;
  status: string;
  timeSpentSeconds: number;
  maxPoints: number;
}

export interface AttemptDetail {
  _id: string;
  userId: string;
  examConfigId?: { _id: string; name: string };
  status: string;
  gradingStatus: string;
  gradedBy?: string;
  gradedAt?: string;
  score: number;
  percentage: number;
  questions: AttemptDetailQuestion[];
  messages?: {
    sender: 'student' | 'professor';
    text: string;
    createdAt: string;
    read: boolean;
  }[];
}

const DIFFICULTY_BASE_POINTS: Record<string, number> = { easy: 1, medium: 1, hard: 1 };

export function getBasePoints(difficulty: string): number {
  return DIFFICULTY_BASE_POINTS[difficulty] || 1;
}

export function extractOpenTextPreview(raw: Record<string, unknown>): OpenTextPreviewItem[] | undefined {
  const questions = raw.questions as Array<Record<string, unknown>> | undefined;
  if (!questions || questions.length === 0) return undefined;

  const previews: OpenTextPreviewItem[] = [];

  for (const q of questions) {
    const snapshot = q.questionSnapshot as Record<string, unknown> | undefined;
    if (!snapshot) continue;
    const type = snapshot.type as string | undefined;
    if (type !== 'open_text' && type !== 'development') continue;
    const answer = q.manualTextAnswer as string | undefined;
    if (!answer || !answer.trim()) continue;

    const questionText = (snapshot.questionText as string) || '';
    const snippet = answer.length > 120 ? answer.slice(0, 117) + '...' : answer;

    previews.push({ questionText, answerSnippet: snippet });
  }

  return previews.length > 0 ? previews : undefined;
}

function extractMessages(raw: Record<string, unknown>): AttemptDetail['messages'] {
  const rawMessages = raw.messages as Array<Record<string, unknown>> | undefined;
  if (!rawMessages || rawMessages.length === 0) return undefined;
  return rawMessages.map((m) => ({
    sender: m.sender as 'student' | 'professor',
    text: m.text as string,
    createdAt: (m.createdAt as Date)?.toISOString?.() ?? String(m.createdAt),
    read: m.read as boolean,
  }));
}

export function sanitizeGradingAttempt(raw: Record<string, unknown>): SerializedGradingAttempt {
  const result: SerializedGradingAttempt = {
    _id: (raw._id as { toString(): string }).toString(),
    userId: (raw.userId as { toString(): string })?.toString() || '',
    mode: raw.mode as 'training' | 'mock',
    score: raw.score as number,
    percentage: raw.percentage as number,
    startedAt: (raw.startedAt as Date).toISOString(),
    status: raw.status as 'in_progress' | 'completed' | 'timeout',
    gradingStatus: raw.gradingStatus as 'auto_graded' | 'pending_manual_review' | 'manually_graded',
  };
  if (raw.endedAt) result.endedAt = (raw.endedAt as Date).toISOString();
  if (raw.gradedBy) result.gradedBy = raw.gradedBy as string;
  if (raw.gradedAt) result.gradedAt = (raw.gradedAt as Date).toISOString();
  if (raw.examConfigId) {
    const config = raw.examConfigId as Record<string, unknown>;
    result.examConfigId = {
      _id: (config._id as { toString(): string }).toString(),
      name: config.name as string,
      passThreshold: config.passThreshold as number,
    };
  }
  const preview = extractOpenTextPreview(raw);
  if (preview) result.openTextPreview = preview;
  return result;
}

export function buildAttemptDetail(raw: Record<string, unknown>): AttemptDetail | null {
  if (!raw) return null;
  const a = raw;
  const questionsArr = a.questions as Array<Record<string, unknown>> | undefined;
  return {
    _id: (a._id as { toString(): string }).toString(),
    userId: (a.userId as { toString(): string })?.toString() || '',
    examConfigId: a.examConfigId
      ? {
          _id: ((a.examConfigId as Record<string, unknown>)._id as { toString(): string }).toString(),
          name: (a.examConfigId as Record<string, unknown>).name as string,
        }
      : undefined,
    status: a.status as string,
    gradingStatus: a.gradingStatus as string,
    gradedBy: a.gradedBy as string | undefined,
    gradedAt: (a.gradedAt as Date)?.toISOString(),
    score: a.score as number,
    percentage: a.percentage as number,
    questions: (questionsArr || []).map((q: Record<string, unknown>, index: number) => {
      const snapshot = q.questionSnapshot as Record<string, unknown> | undefined;
      const diff = (snapshot?.difficulty as string) || 'medium';
      return {
        questionIndex: index,
        questionText: (snapshot?.questionText as string) || '',
        type: (snapshot?.type as 'multiple_choice' | 'open_text' | 'development') || 'multiple_choice',
        options: (snapshot?.options as string[]) || [],
        correctOptionIndex: (snapshot?.correctOptionIndex as number) ?? 0,
        selectedOptionIndex: q.selectedOptionIndex as number | null | undefined,
        manualTextAnswer: q.manualTextAnswer as string | undefined,
        attachmentUrl: q.attachmentUrl as string | undefined,
        manualPointsAwarded: q.manualPointsAwarded as number | undefined,
        feedback: q.feedback as string | undefined,
        isCorrect: q.isCorrect as boolean,
        status: q.status as string,
        timeSpentSeconds: q.timeSpentSeconds as number,
        maxPoints: getBasePoints(diff),
      };
    }),
    messages: extractMessages(a),
  };
}
