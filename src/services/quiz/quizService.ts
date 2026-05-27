import connectDB from '@/lib/database/mongodb';
import Question from '@/models/Question';
import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig';
import ExamAssignment from '@/models/ExamAssignment';
import { type IQuestion } from '@/models/Question';
import { type IExamAttempt } from '@/models/ExamAttempt';
import { type IExamConfig } from '@/models/ExamConfig';
import { type QuizAttemptQuestion } from '@/types/quiz';

export class QuizService {
  /**
   * Genera un nuevo intento de examen basado en una configuración técnica
   */
  static async createExamAttempt(userId: string, tenantId: string, examConfigId: string): Promise<IExamAttempt> {
    await connectDB();

    // 0. Validar que existe una asignación activa y vigente
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

    // 1. Recuperar configuración
    const config = await ExamConfig.findById(examConfigId);
    if (!config || !config.active) {
      throw new Error('Configuración de examen no válida o inactiva');
    }

    // 1.5 Validar límite de intentos (usar el más restrictivo entre asignación y config)
    const effectiveMaxAttempts = activeAssignment.maxAttempts > 0
      ? activeAssignment.maxAttempts
      : config.maxAttempts;

    if (effectiveMaxAttempts && effectiveMaxAttempts > 0) {
      const attemptsCount = await ExamAttempt.countDocuments({
        userId,
        examConfigId,
        isInvalidated: { $ne: true }
      });
      if (attemptsCount >= effectiveMaxAttempts) {
        throw new Error('Has alcanzado el límite máximo de intentos permitidos para este examen.');
      }
    }



    // 2. Construir query de preguntas
    const query: Record<string, unknown> = { tenantId, active: true };
    if (config.moduleFilter.length > 0) {
      query.module = { $in: config.moduleFilter };
    }

    // 3. Recuperar preguntas candidatas
    let allQuestions: IQuestion[] = await Question.find(query).lean();
    if (allQuestions.length === 0) {
      throw new Error('No hay preguntas disponibles en el banco de datos para esta configuración');
    }

    // 4. Excluir preguntas ya acertadas en intentos previos (si está activado)
    if (config.excludePreviouslyCorrect) {
      const previousAttempts = await ExamAttempt.find({
        userId,
        examConfigId,
        status: 'completed',
        isInvalidated: { $ne: true },
      });

      if (previousAttempts.length > 0) {
        const correctlyAnsweredIds = new Set<string>();
        for (const attempt of previousAttempts) {
          for (const q of attempt.questions) {
            if (q.status === 'correcta') {
              correctlyAnsweredIds.add(q.questionId.toString());
            }
          }
        }

        if (correctlyAnsweredIds.size > 0) {
          allQuestions = allQuestions.filter(
            (q) => !correctlyAnsweredIds.has(q._id.toString())
          );

          if (allQuestions.length === 0) {
            throw new Error('Ya has acertado todas las preguntas disponibles. No hay nuevas preguntas para evaluar.');
          }
        }
      }
    }

    // 5. Selección adaptativa / estratificada / aleatoria
    let selectedQuestions: IQuestion[] = [];
    const targetCount = Math.min(config.questionCount, allQuestions.length);

    if (config.adaptiveQuestionSelection) {
      // --- Adaptive Selection: ponderar preguntas según rendimiento histórico ---
      const previousAttempts = await ExamAttempt.find({
        userId,
        examConfigId,
        status: 'completed',
        isInvalidated: { $ne: true },
      });

      if (previousAttempts.length > 0) {
        // Calcular estadísticas de rendimiento por módulo y dificultad
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

        // Peso inverso: menor tasa de acierto → mayor peso
        const getWeight = (stats: { correct: number; total: number }): number => {
          const rate = stats.correct / stats.total;
          return Math.max(0.2, 1.5 - rate);
        };

        // Puntuar cada pregunta según rendimiento en su módulo y dificultad
        const scored = allQuestions.map(q => {
          const modStats = moduleStats[q.module];
          const diffStats = difficultyStats[q.difficulty || 'medium'];

          let weight = 1;
          if (modStats && modStats.total >= 1) {
            weight *= getWeight(modStats);
          }
          if (diffStats && diffStats.total >= 1) {
            weight *= getWeight(diffStats);
          }
          // Priorizar ligeramente módulos sin intentos previos
          if (!modStats) weight *= 1.2;

          return { question: q, weight };
        });

        // Selección ponderada (muestreo sin reemplazo)
        const pool = [...scored];
        for (let i = 0; i < targetCount && pool.length > 0; i++) {
          const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
          let random = Math.random() * totalWeight;
          let idx = 0;
          for (let j = 0; j < pool.length; j++) {
            random -= pool[j].weight;
            if (random <= 0) {
              idx = j;
              break;
            }
          }
          selectedQuestions.push(pool[idx].question);
          pool.splice(idx, 1);
        }
      } else {
        // Sin datos históricos: aleatoria simple
        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        selectedQuestions = shuffled.slice(0, targetCount);
      }
    } else if (config.difficultyDistribution && 
        (config.difficultyDistribution.easy || 
         config.difficultyDistribution.medium || 
         config.difficultyDistribution.hard)) {
      
      const dist = config.difficultyDistribution;
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      
      for (const diff of difficulties) {
        const countNeeded = dist[diff] || 0;
        if (countNeeded > 0) {
          const diffQuestions = allQuestions.filter(q => q.difficulty === diff);
          const actualCount = Math.min(countNeeded, diffQuestions.length);
          if (actualCount > 0) {
            const shuffledDiff = diffQuestions.sort(() => 0.5 - Math.random());
            selectedQuestions.push(...shuffledDiff.slice(0, actualCount));
          }
        }
      }
      
      // Si quedan huecos por llenar debido a una distribución parcial, rellenamos con el resto
      const remainingCount = targetCount - selectedQuestions.length;
      if (remainingCount > 0) {
        const selectedIds = new Set(selectedQuestions.map(q => q._id.toString()));
        const remainingPool = allQuestions.filter(q => !selectedIds.has(q._id.toString()));
        const shuffledRemaining = remainingPool.sort(() => 0.5 - Math.random());
        selectedQuestions.push(...shuffledRemaining.slice(0, remainingCount));
      }
    } else {
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, targetCount);
    }

    // 5. Crear el intento con AttemptToken transitorio y su expiración
    const attemptToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
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
        let finalOptions = [...q.options];
        let newCorrectIndex = q.correctOptionIndex;

        if (config.shuffleOptions) {
          const correctText = q.options[q.correctOptionIndex];
          const incorrectOptions = q.options.filter((_, idx) => idx !== q.correctOptionIndex);
          const shuffledIncorrect = [...incorrectOptions].sort(() => 0.5 - Math.random());
          
          const maxOptions = (config as any).sliceOptionsCount;
          const sliceCount = (maxOptions && maxOptions >= 2) ? maxOptions : q.options.length;
          const selectedIncorrect = shuffledIncorrect.slice(0, sliceCount - 1);
          
          const mergedOptions = [correctText, ...selectedIncorrect];
          finalOptions = mergedOptions.sort(() => 0.5 - Math.random());
          newCorrectIndex = finalOptions.indexOf(correctText);
        }

        return {
          questionId: q._id,
          questionSnapshot: {
            questionText: q.questionText,
            options: finalOptions,
            module: q.module,
            source: q.source,
            explanation: q.explanation,
            correctOptionIndex: newCorrectIndex,
            difficulty: q.difficulty
          },
          position: index + 1,
          isCorrect: false,
          status: 'no_respondida',
          timeSpentSeconds: 0,
        };
      }),
    });

    if (attempt && typeof attempt.save === 'function') {
      await attempt.save();
    }
    return attempt;
  }

  /**
   * Registra la respuesta a una pregunta específica
   */
  static async submitAnswer(
    attemptId: string,
    questionIndex: number,
    selectedOptionIndex: number | null,
    timeSpent: number,
    status: QuizAttemptQuestion['status'],
    userId: string,
    attemptToken?: string
  ): Promise<IExamAttempt> {
    await connectDB();
    
    const attempt = await ExamAttempt.findOne({ _id: attemptId, userId });
    if (!attempt || attempt.status !== 'in_progress') {
      throw new Error('Exam attempt not found, unauthorized, or already finished');
    }

    // Validación temporal y token del intento
    if (attempt.attemptToken) {
      if (!attemptToken || attempt.attemptToken !== attemptToken) {
        throw new Error('Token de intento no válido o desincronizado.');
      }
      if (attempt.attemptTokenExpiresAt && new Date() > attempt.attemptTokenExpiresAt) {
        throw new Error('El token de intento ha expirado.');
      }
    }

    const question = attempt.questions[questionIndex];
    if (!question) throw new Error('Question index out of bounds');

    question.selectedOptionIndex = selectedOptionIndex;
    question.timeSpentSeconds = timeSpent;
    question.status = status;
    question.isCorrect = status === 'correcta';

    await attempt.save();
    return attempt;
  }

  /**
   * Finaliza el examen y calcula la nota según las reglas de la configuración
   */
  static async finishExam(attemptId: string, userId: string, attemptToken?: string): Promise<IExamAttempt> {
    await connectDB();
    
    const attempt = await ExamAttempt.findOne({ _id: attemptId, userId }).populate<{ examConfigId: IExamConfig }>('examConfigId');
    if (!attempt) throw new Error('Exam attempt not found or unauthorized');

    // Validación temporal y token del intento
    if (attempt.attemptToken) {
      if (!attemptToken || attempt.attemptToken !== attemptToken) {
        throw new Error('Token de intento no válido o desincronizado.');
      }
      if (attempt.attemptTokenExpiresAt && new Date() > attempt.attemptTokenExpiresAt) {
        throw new Error('El token de intento ha expirado.');
      }
    }

    const config = attempt.examConfigId;
    if (!config) throw new Error('Exam configuration missing');
    
    let totalScore = 0;
    let maxPossible = 0;
    const questions = attempt.questions;
    
    // Cálculo de puntuación dinámica
    for (const q of questions) {
      const diff = q.questionSnapshot.difficulty || 'medium';
      let correctPoints = 1;
      
      if (config?.scoringMode === 'weighted' && config.difficultyWeights) {
        correctPoints = config.difficultyWeights[diff as 'easy' | 'medium' | 'hard'] || 1;
      } else {
        correctPoints = config?.pointsPerCorrect || 1;
      }
      
      maxPossible += correctPoints;
      
      if (q.status === 'correcta') {
        totalScore += correctPoints;
      } else if (q.status === 'incorrecta' && config?.scoringMode === 'penalty') {
        totalScore -= config.penaltyPerIncorrect || 0;
      }
    }
    
    attempt.status = 'completed';
    attempt.endedAt = new Date();
    attempt.score = Math.max(0, totalScore);
    attempt.percentage = maxPossible > 0 ? (attempt.score / maxPossible) * 100 : 0;

    // Por defecto, todos los intentos se gradúan automáticamente
    // (cuando se implementen preguntas open_text, se cambiará a 'pending_manual_review' según corresponda)
    attempt.gradingStatus = 'auto_graded';

    await attempt.save();
    // Cast necesario: tras populate(), examConfigId es IExamConfig (no ObjectId).
    // Bajo riesgo — el documento tiene todos los campos requeridos por la interfaz.
    return attempt as unknown as IExamAttempt;
  }
}
