import connectDB from '@/lib/database/mongodb';
import Question from '@/models/Question';
import ExamAttempt from '@/models/ExamAttempt';
import { type IQuestion } from '@/models/Question';
import { type IExamAttempt } from '@/models/ExamAttempt';
import { type QuizAttemptQuestion } from '@/types/quiz';

export class QuizService {
  /**
   * Genera un nuevo intento de examen de 30 preguntas aleatorias
   */
  static async createExamAttempt(userId: string, tenantId: string, mode: 'training' | 'mock'): Promise<IExamAttempt> {
    await connectDB();

    const allQuestions: IQuestion[] = await Question.find({
      tenantId,
      active: true,
    }).lean();

    if (allQuestions.length === 0) {
      throw new Error('No questions available for this tenant');
    }

    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 30);

    const attempt = await ExamAttempt.create({
      tenantId,
      userId,
      mode,
      status: 'in_progress',
      startedAt: new Date(),
      timeLimitSeconds: 600,
      questionTimeLimitSeconds: 30,
      questions: selectedQuestions.map((q: IQuestion, index: number) => ({
        questionId: q._id,
        questionSnapshot: {
          questionText: q.questionText,
          options: q.options,
          module: q.module,
          source: q.source,
          explanation: q.explanation,
          correctOptionIndex: q.correctOptionIndex
        },
        position: index + 1,
        isCorrect: false,
        status: 'no_respondida',
        timeSpentSeconds: 0,
      })),
    });

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
   * Finaliza el examen y calcula la nota
   */
  static async finishExam(attemptId: string): Promise<IExamAttempt> {
    await connectDB();
    
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) throw new Error('Exam attempt not found');

    const aciertos = attempt.questions.filter((q: QuizAttemptQuestion) => q.status === 'correcta').length;
    
    attempt.status = 'completed';
    attempt.endedAt = new Date();
    attempt.score = aciertos;
    attempt.percentage = (aciertos / attempt.questions.length) * 100;

    await attempt.save();
    return attempt;
  }
}
