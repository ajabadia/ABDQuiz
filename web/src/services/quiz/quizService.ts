import connectDB from '@/lib/database/mongodb';
import Question from '@/models/Question';
import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig';
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

    // 1. Recuperar configuración
    const config = await ExamConfig.findById(examConfigId);
    if (!config || !config.active) {
      throw new Error('Configuración de examen no válida o inactiva');
    }

    // 2. Construir query de preguntas
    const query: Record<string, unknown> = { tenantId, active: true };
    if (config.moduleFilter.length > 0) {
      query.module = { $in: config.moduleFilter };
    }

    // 3. Recuperar preguntas candidatas
    const allQuestions: IQuestion[] = await Question.find(query).lean();
    if (allQuestions.length === 0) {
      throw new Error('No hay preguntas disponibles en el banco de datos para esta configuración');
    }

    // 4. Selección estratificada / aleatoria (Defensiva)
    let selectedQuestions: IQuestion[] = [];
    const targetCount = Math.min(config.questionCount, allQuestions.length);
    
    if (config.difficultyDistribution && 
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

    // 5. Crear el intento
    const attempt = await ExamAttempt.create({
      tenantId,
      userId,
      examConfigId: config._id,
      mode: config.showFeedbackDuringExam ? 'training' : 'mock',
      status: 'in_progress',
      startedAt: new Date(),
      timeLimitSeconds: config.globalTimeLimitSeconds || 0,
      questionTimeLimitSeconds: config.questionTimeLimitSeconds || 0,
      questions: selectedQuestions.map((q: IQuestion, index: number) => ({
        questionId: q._id,
        questionSnapshot: {
          questionText: q.questionText,
          options: config.shuffleOptions ? [...q.options].sort(() => 0.5 - Math.random()) : q.options,
          module: q.module,
          source: q.source,
          explanation: q.explanation,
          correctOptionIndex: q.correctOptionIndex,
          difficulty: q.difficulty
        },
        position: index + 1,
        isCorrect: false,
        status: 'no_respondida',
        timeSpentSeconds: 0,
      })),
    });

    // Ajustar correctOptionIndex si barajamos opciones
    if (config.shuffleOptions) {
      for (const q of attempt.questions) {
        const originalQ = selectedQuestions.find(sq => sq._id.toString() === q.questionId.toString());
        if (originalQ) {
          const correctText = originalQ.options[originalQ.correctOptionIndex];
          q.questionSnapshot.correctOptionIndex = q.questionSnapshot.options.indexOf(correctText);
        }
      }
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
    status: QuizAttemptQuestion['status']
  ): Promise<IExamAttempt> {
    await connectDB();
    
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'in_progress') {
      throw new Error('Exam attempt not found or already finished');
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
  static async finishExam(attemptId: string): Promise<IExamAttempt> {
    await connectDB();
    
    const attempt = await ExamAttempt.findById(attemptId).populate('examConfigId');
    if (!attempt) throw new Error('Exam attempt not found');

    const config = attempt.examConfigId as unknown as IExamConfig;
    
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

    await attempt.save();
    return attempt;
  }
}
