import type { SerializedAttempt } from './quizTypes';

export function sanitizeAttempt(raw: Record<string, unknown>): SerializedAttempt {
  const result: SerializedAttempt = {
    _id: (raw._id as { toString(): string }).toString(),
    userId: (raw.userId as { toString(): string })?.toString() || '',
    mode: raw.mode as 'training' | 'mock',
    score: raw.score as number,
    percentage: raw.percentage as number,
    startedAt: (raw.startedAt as Date).toISOString(),
    status: raw.status as 'in_progress' | 'completed' | 'timeout',
  };
  if (raw.endedAt) result.endedAt = (raw.endedAt as Date).toISOString();
  if (raw.isInvalidated) result.isInvalidated = raw.isInvalidated as boolean;
  if (raw.invalidatedBy) result.invalidatedBy = raw.invalidatedBy as string;
  if (raw.invalidatedAt) result.invalidatedAt = (raw.invalidatedAt as Date).toISOString();
  if (raw.examConfigId) {
    const config = raw.examConfigId as Record<string, unknown>;
    result.examConfigId = {
      _id: (config._id as { toString(): string }).toString(),
      name: config.name as string,
      passThreshold: config.passThreshold as number,
    };
  }
  return result;
}
