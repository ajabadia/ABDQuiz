/**
 * @purpose Gestiona las configuraciones de exámenes por defecto y las serializa para almacenamiento o transmisión.
 * @purpose_en Manages default exam configurations and serializes them for storage or transmission.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:3,imports:2,sig:1kitba5
 * @lastUpdated 2026-06-23T16:27:57.653Z
 */

import ExamConfig from '@/models/ExamConfig';
import type { SerializedExamConfig } from '@/types/quiz';

export const DEFAULT_CONFIGS = [
  {
    name: 'Entrenamiento Libre',
    description: 'Feedback inmediato, explicaciones detalladas y sin presión de tiempo global. Ideal para asentar conceptos.',
    questionCount: 10,
    moduleFilter: [],
    globalTimeLimitSeconds: 0,
    questionTimeLimitSeconds: 0,
    scoringMode: 'simple' as const,
    passThreshold: 70,
    showFeedbackDuringExam: true,
    allowSkip: true,
    allowReviewPrevious: true,
    autoAdvanceOnSelect: false,
    reviewOmittedQuestions: false,
    maxAttempts: 0,
    sliceOptionsCount: null,
    isDefault: true,
    active: true,
  },
  {
    name: 'Simulacro Estándar',
    description: 'Condiciones reales. 10 minutos, 30s por tarea, sin vuelta atrás. La prueba definitiva.',
    questionCount: 30,
    moduleFilter: [],
    globalTimeLimitSeconds: 600,
    questionTimeLimitSeconds: 30,
    scoringMode: 'simple' as const,
    passThreshold: 70,
    showFeedbackDuringExam: false,
    allowSkip: true,
    allowReviewPrevious: false,
    autoAdvanceOnSelect: false,
    reviewOmittedQuestions: false,
    maxAttempts: 0,
    sliceOptionsCount: null,
    isDefault: true,
    active: true,
  },
];

export async function seedDefaultConfigs(tenantId: string, userId: string): Promise<void> {
  await ExamConfig.insertMany(
    DEFAULT_CONFIGS.map((cfg) => ({ ...cfg, tenantId, createdBy: userId }))
  );
}

export function serializeExamConfig(doc: Record<string, unknown>): SerializedExamConfig {
  const result: Record<string, unknown> = { ...doc };
  result._id = (doc._id as { toString(): string }).toString();
  result.createdAt = (doc.createdAt as Date | undefined)?.toISOString() || '';
  result.updatedAt = (doc.updatedAt as Date | undefined)?.toISOString() || '';
  return result as unknown as SerializedExamConfig;
}
