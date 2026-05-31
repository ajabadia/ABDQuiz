import { connectDB } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import { type IQuestion } from '@/models/Question';

// ── Helper types ──────────────────────────────

interface WeightedQuestion {
  question: IQuestion;
  weight: number;
}

export interface DifficultyDist {
  easy?: number;
  medium?: number;
  hard?: number;
}

// ── Question selection strategies ─────────────

export function pickRandom(questions: IQuestion[], count: number): IQuestion[] {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function pickByDifficulty(
  questions: IQuestion[],
  count: number,
  dist?: DifficultyDist,
): IQuestion[] {
  if (!dist || (!dist.easy && !dist.medium && !dist.hard)) {
    return pickRandom(questions, count);
  }

  const selected: IQuestion[] = [];
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

  for (const diff of difficulties) {
    const countNeeded = dist[diff] || 0;
    if (countNeeded > 0) {
      const diffQuestions = questions.filter(q => q.difficulty === diff);
      const actualCount = Math.min(countNeeded, diffQuestions.length);
      if (actualCount > 0) {
        const shuffledDiff = [...diffQuestions].sort(() => 0.5 - Math.random());
        selected.push(...shuffledDiff.slice(0, actualCount));
      }
    }
  }

  // Fill remaining slots if partial distribution
  const remainingCount = count - selected.length;
  if (remainingCount > 0) {
    const selectedIds = new Set(selected.map(q => q._id.toString()));
    const pool = questions.filter(q => !selectedIds.has(q._id.toString()));
    selected.push(...pickRandom(pool, remainingCount));
  }

  return selected;
}

export async function pickAdaptive(
  questions: IQuestion[],
  count: number,
  userId: string,
  examConfigId: string,
): Promise<IQuestion[]> {
  const previousAttempts = await ExamAttempt.find({
    userId,
    examConfigId,
    status: 'completed',
    isInvalidated: { $ne: true },
  });

  if (previousAttempts.length === 0) {
    return pickRandom(questions, count);
  }

  // Calculate per-module and per-difficulty stats
  const moduleStats: Record<string, { correct: number; total: number }> = {};
  const difficultyStats: Record<string, { correct: number; total: number }> = {};

  for (const attempt of previousAttempts) {
    for (const q of attempt.questions) {
      const mod = q.questionSnapshot.module || 'unknown';
      const diff = q.questionSnapshot.difficulty || 'medium';

      if (!moduleStats[mod]) moduleStats[mod] = { correct: 0, total: 0 };
      if (!difficultyStats[diff]) difficultyStats[diff] = { correct: 0, total: 0 };

      moduleStats[mod].total++;
      difficultyStats[diff].total++;

      if (q.status === 'correcta') {
        moduleStats[mod].correct++;
        difficultyStats[diff].correct++;
      }
    }
  }

  const getWeight = (stats: { correct: number; total: number }): number => {
    const rate = stats.correct / stats.total;
    return Math.max(0.2, 1.5 - rate);
  };

  // Score each question inversely to past performance
  const scored: WeightedQuestion[] = questions.map(q => {
    const modStats = moduleStats[q.module];
    const diffStats = difficultyStats[q.difficulty || 'medium'];

    let weight = 1;
    if (modStats && modStats.total >= 1) weight *= getWeight(modStats);
    if (diffStats && diffStats.total >= 1) weight *= getWeight(diffStats);
    if (!modStats) weight *= 1.2; // Prioritize unseen modules

    return { question: q, weight };
  });

  // Weighted sampling without replacement
  const pool = [...scored];
  const selected: IQuestion[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) { idx = j; break; }
    }
    selected.push(pool[idx].question);
    pool.splice(idx, 1);
  }

  return selected;
}
