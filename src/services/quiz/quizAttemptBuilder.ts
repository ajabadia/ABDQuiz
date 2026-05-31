import { connectDB } from '@ajabadia/satellite-sdk';
import Question from '@/models/Question';
import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig';
import ExamAssignment, { type IExamAssignment } from '@/models/ExamAssignment';
import { type IQuestion } from '@/models/Question';
import { type IExamAttempt } from '@/models/ExamAttempt';
import { type IExamConfig } from '@/models/ExamConfig';
import { pickRandom, pickByDifficulty, pickAdaptive } from './questionSelectionStrategies';

// ── Option processing ─────────────────────────

function processOptions(
  options: string[],
  correctIndex: number,
  sliceCount?: number,
  shuffle?: boolean,
): { finalOptions: string[]; newCorrectIndex: number } {
  let finalOptions = [...options];
  let newCorrectIndex = correctIndex;

  // Step 1: Dynamic slicing
  const effectiveSlice = (sliceCount != null && sliceCount >= 2) ? sliceCount : options.length;
  if (effectiveSlice < options.length) {
    const correctText = options[correctIndex];
    const incorrectOptions = options.filter((_, idx) => idx !== correctIndex);
    const shuffledIncorrect = [...incorrectOptions].sort(() => 0.5 - Math.random());
    const selectedIncorrect = shuffledIncorrect.slice(0, effectiveSlice - 1);
    finalOptions = [correctText, ...selectedIncorrect];
    newCorrectIndex = 0;
  }

  // Step 2: Shuffle
  if (shuffle) {
    const correctText = finalOptions[newCorrectIndex];
    finalOptions = [...finalOptions].sort(() => 0.5 - Math.random());
    newCorrectIndex = finalOptions.indexOf(correctText);
  }

  return { finalOptions, newCorrectIndex };
}

// ── Assigment & attempt validation ────────────

async function validateAssignment(
  tenantId: string,
  examConfigId: string,
): Promise<void> {
  const now = new Date();
  const activeAssignment = await ExamAssignment.findOne({
    tenantId,
    examConfigId,
    status: 'published',
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  if (!activeAssignment) {
    throw new Error('No hay una asignación activa y vigente para esta configuración de examen');
  }
}

async function checkAttemptLimit(
  userId: string,
  examConfigId: string,
  config: IExamConfig,
  assignment: Pick<IExamAssignment, 'maxAttempts'>,
): Promise<void> {
  const effectiveMaxAttempts = assignment.maxAttempts > 0
    ? assignment.maxAttempts
    : config.maxAttempts;

  if (effectiveMaxAttempts && effectiveMaxAttempts > 0) {
    const attemptsCount = await ExamAttempt.countDocuments({
      userId,
      examConfigId,
      isInvalidated: { $ne: true },
    });
    if (attemptsCount >= effectiveMaxAttempts) {
      throw new Error('Has alcanzado el límite máximo de intentos permitidos para este examen.');
    }
  }
}

async function excludePreviouslyCorrectQuestions(
  userId: string,
  examConfigId: string,
  questions: IQuestion[],
  config: IExamConfig,
): Promise<IQuestion[]> {
  if (!config.excludePreviouslyCorrect) return questions;

  const previousAttempts = await ExamAttempt.find({
    userId,
    examConfigId,
    status: 'completed',
    isInvalidated: { $ne: true },
  });

  if (previousAttempts.length === 0) return questions;

  const correctlyAnsweredIds = new Set<string>();
  for (const attempt of previousAttempts) {
    for (const q of attempt.questions) {
      if (q.status === 'correcta') {
        correctlyAnsweredIds.add(q.questionId.toString());
      }
    }
  }

  if (correctlyAnsweredIds.size === 0) return questions;

  const filtered = questions.filter(q => !correctlyAnsweredIds.has(q._id.toString()));
  if (filtered.length === 0) {
    throw new Error('Ya has acertado todas las preguntas disponibles. No hay nuevas preguntas para evaluar.');
  }

  return filtered;
}

// ── Attempt creation ──────────────────────────

export async function buildExamAttempt(
  userId: string,
  tenantId: string,
  examConfigId: string,
): Promise<IExamAttempt> {
  await connectDB();

  // 0. Validate active assignment
  await validateAssignment(tenantId, examConfigId);

  // 1. Load config
  const config = await ExamConfig.findById(examConfigId);
  if (!config || !config.active) {
    throw new Error('Configuración de examen no válida o inactiva');
  }

  // 1.5 Check attempt limit — we re-fetch the assignment for up-to-date data
  const now = new Date();
  const activeAssignment = await ExamAssignment.findOne({
    tenantId,
    examConfigId,
    status: 'published',
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  if (!activeAssignment) {
    throw new Error('No hay una asignación activa y vigente para esta configuración de examen');
  }
  const assignment = activeAssignment;
  await checkAttemptLimit(userId, examConfigId, config, assignment);

  // 2. Build query
  const query: Record<string, unknown> = { tenantId, active: true };
  if (config.moduleFilter.length > 0) {
    query.module = { $in: config.moduleFilter };
  }

  // 3. Fetch candidate questions
  let allQuestions: IQuestion[] = await Question.find(query).lean();
  if (allQuestions.length === 0) {
    throw new Error('No hay preguntas disponibles en el banco de datos para esta configuración');
  }

  // 4. Exclude previously correct (if enabled)
  allQuestions = await excludePreviouslyCorrectQuestions(userId, examConfigId, allQuestions, config);

  // 5. Select questions (adaptive / stratified / random)
  const targetCount = Math.min(config.questionCount, allQuestions.length);
  let selectedQuestions: IQuestion[];

  if (config.adaptiveQuestionSelection) {
    selectedQuestions = await pickAdaptive(allQuestions, targetCount, userId, examConfigId);
  } else if (config.difficultyDistribution) {
    selectedQuestions = pickByDifficulty(allQuestions, targetCount, config.difficultyDistribution);
  } else {
    selectedQuestions = pickRandom(allQuestions, targetCount);
  }

  // 6. Create attempt with token
  const attemptToken = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2);

  const limitSec = config.globalTimeLimitSeconds || 600;
  const attemptTokenExpiresAt = new Date(Date.now() + (limitSec + 30) * 1000);

  const attempt = await ExamAttempt.create({
    tenantId,
    userId,
    examConfigId: config._id,
    mode: config.showFeedbackDuringExam ? 'training' : 'mock',
    status: 'in_progress',
    startedAt: new Date(),
    timeLimitSeconds: config.globalTimeLimitSeconds || 0,
    questionTimeLimitSeconds: config.questionTimeLimitSeconds || 0,
    attemptToken,
    attemptTokenExpiresAt,
    questions: selectedQuestions.map((q: IQuestion, index: number) => {
      const { finalOptions, newCorrectIndex } = processOptions(
        q.options,
        q.correctOptionIndex,
        config.sliceOptionsCount ?? undefined,
        config.shuffleOptions,
      );

      return {
        questionId: q._id,
        questionSnapshot: {
          questionText: q.questionText,
          options: finalOptions,
          module: q.module,
          source: q.source,
          explanation: q.explanation,
          correctOptionIndex: newCorrectIndex,
          difficulty: q.difficulty,
          type: q.type,
          attachments: q.attachments || [],
        },
        position: index + 1,
        isCorrect: false,
        status: 'no_respondida' as const,
        timeSpentSeconds: 0,
      };
    }),
  });

  if (attempt && typeof attempt.save === 'function') {
    await attempt.save();
  }
  return attempt;
}
