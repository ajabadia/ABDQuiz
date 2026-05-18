import connectDB from '@/lib/database/mongodb';
import Allegation, { type IAllegation } from '@/models/Allegation';
import ExamAttempt from '@/models/ExamAttempt';
import ExamConfig from '@/models/ExamConfig';
import Question from '@/models/Question';
import mongoose from 'mongoose';

interface IAttemptQuestion {
  questionId: mongoose.Types.ObjectId;
  selectedOptionIndex?: number;
  isCorrect?: boolean;
  status?: 'correcta' | 'incorrecta' | 'no_respondida';
  questionSnapshot: {
    questionText: string;
    correctOptionIndex: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    isCancelled?: boolean;
  };
}

export class AllegationService {
  /**
   * Envía una nueva reclamación técnica de un alumno
   */
  static async submitAllegation(
    userId: string,
    tenantId: string,
    userEmail: string,
    userName: string,
    examAttemptId: string,
    questionId: string,
    reason: string
  ): Promise<IAllegation> {
    await connectDB();

    // 1. Validar existencia del intento
    const attempt = await ExamAttempt.findById(examAttemptId);
    if (!attempt) {
      throw new Error('Intento de examen no encontrado');
    }

    // 2. Extraer el texto estático del snapshot de la pregunta
    const questionBlock = (attempt.questions as unknown as IAttemptQuestion[]).find(
      (q) => q.questionId.toString() === questionId
    );
    if (!questionBlock) {
      throw new Error('La pregunta no pertenece a este intento de examen');
    }

    const questionText = questionBlock.questionSnapshot.questionText;

    // 3. Crear la reclamación
    const allegation = await Allegation.create({
      tenantId,
      userId,
      userEmail,
      userName,
      examAttemptId: new mongoose.Types.ObjectId(examAttemptId),
      questionId: new mongoose.Types.ObjectId(questionId),
      questionText,
      reason,
      status: 'pending',
    });

    return allegation;
  }

  /**
   * Rechaza una reclamación de forma directa
   */
  static async rejectAllegation(
    allegationId: string,
    feedback: string,
    resolvedBy: string
  ): Promise<IAllegation> {
    await connectDB();

    const allegation = await Allegation.findById(allegationId);
    if (!allegation || allegation.status !== 'pending') {
      throw new Error('Reclamación no encontrada o ya procesada');
    }

    allegation.status = 'rejected';
    allegation.feedback = feedback;
    allegation.resolvedBy = resolvedBy;
    allegation.resolvedAt = new Date();

    await allegation.save();
    return allegation;
  }

  /**
   * Resuelve técnicamente una impugnación y ejecuta el recálculo retroactivo
   */
  static async resolveAllegation(
    allegationId: string,
    resolutionMode: 'CORRECTION_SHIFT' | 'CANCEL_QUESTION' | 'GIVE_POINTS_TO_ALL',
    feedback: string,
    resolvedBy: string,
    nextCorrectOptionIndex?: number
  ): Promise<IAllegation> {
    await connectDB();

    // 1. Validar la reclamación
    const allegation = await Allegation.findById(allegationId);
    if (!allegation || allegation.status !== 'pending') {
      throw new Error('Reclamación no encontrada o ya procesada');
    }

    const tenantId = allegation.tenantId;
    const questionId = allegation.questionId;

    // 2. Modificación de la base de datos de preguntas activa para futuros exámenes
    if (resolutionMode === 'CORRECTION_SHIFT' && typeof nextCorrectOptionIndex === 'number') {
      await Question.updateOne(
        { _id: questionId },
        { $set: { correctOptionIndex: nextCorrectOptionIndex } }
      );
    } else if (resolutionMode === 'CANCEL_QUESTION') {
      // Si se anula, se desactiva del pool de preguntas activas
      await Question.updateOne(
        { _id: questionId },
        { $set: { active: false } }
      );
    }

    // 3. Recálculo retroactivo de intentos
    // Buscar todos los intentos de exámenes finalizados o en curso del tenant que contienen esta pregunta
    const attempts = await ExamAttempt.find({
      tenantId,
      'questions.questionId': questionId,
    });

    console.log(`[RECALCULO] Iniciando recálculo en ${attempts.length} intentos para la pregunta: ${questionId}`);

    for (const attempt of attempts) {
      // Buscar la pregunta dentro del intento
      const qBlock = (attempt.questions as unknown as IAttemptQuestion[]).find(
        (q) => q.questionId.toString() === questionId.toString()
      );

      if (!qBlock) continue;

      // Aplicar estrategia
      if (resolutionMode === 'CORRECTION_SHIFT' && typeof nextCorrectOptionIndex === 'number') {
        qBlock.questionSnapshot.correctOptionIndex = nextCorrectOptionIndex;
        const isCorrect = qBlock.selectedOptionIndex === nextCorrectOptionIndex;
        qBlock.isCorrect = isCorrect;
        qBlock.status = isCorrect 
          ? 'correcta' 
          : (typeof qBlock.selectedOptionIndex === 'number' ? 'incorrecta' : 'no_respondida');
      } else if (resolutionMode === 'CANCEL_QUESTION') {
        // Marcamos la pregunta como anulada dentro de su snapshot
        if (!qBlock.questionSnapshot) {
          qBlock.questionSnapshot = {
            questionText: '',
            correctOptionIndex: 0
          };
        }
        qBlock.questionSnapshot.isCancelled = true;
        qBlock.isCorrect = false;
        qBlock.status = 'no_respondida';
      } else if (resolutionMode === 'GIVE_POINTS_TO_ALL') {
        qBlock.isCorrect = true;
        qBlock.status = 'correcta';
      }

      // Marcar modificación del array mixto para asegurar que Mongoose detecte cambios
      attempt.markModified('questions');

      // Si el intento ya está completado o en timeout, recalculamos sus calificaciones finales
      if (attempt.status === 'completed' || attempt.status === 'timeout') {
        const config = await ExamConfig.findById(attempt.examConfigId).lean();
        
        let totalScore = 0;
        let maxPossible = 0;

        for (const q of (attempt.questions as unknown as IAttemptQuestion[])) {
          // Ignorar preguntas anuladas
          if (q.questionSnapshot && q.questionSnapshot.isCancelled) {
            continue;
          }

          const diff = q.questionSnapshot.difficulty || 'medium';
          let correctPoints = 1;

          if (config?.scoringMode === 'weighted' && config.difficultyWeights) {
            correctPoints = config.difficultyWeights[diff as 'easy' | 'medium' | 'hard'] || 1;
          } else {
            correctPoints = config?.pointsPerCorrect || 1;
          }

          maxPossible += correctPoints;

          if (q.isCorrect || q.status === 'correcta') {
            totalScore += correctPoints;
          } else if (q.status === 'incorrecta' && config?.scoringMode === 'penalty') {
            totalScore -= config.penaltyPerIncorrect || 0;
          }
        }

        attempt.score = Math.max(0, totalScore);
        attempt.percentage = maxPossible > 0 ? (attempt.score / maxPossible) * 100 : 0;
      }

      await attempt.save();
    }

    // 4. Salvar estado de la reclamación
    allegation.status = 'approved';
    allegation.resolution = resolutionMode;
    allegation.feedback = feedback;
    allegation.resolvedBy = resolvedBy;
    allegation.resolvedAt = new Date();

    await allegation.save();

    console.log(`[RECALCULO] Recálculo completado con éxito para reclamación: ${allegationId}`);
    return allegation;
  }

  /**
   * Obtiene las alegaciones registradas para un Tenant
   */
  static async getTenantAllegations(tenantId: string): Promise<IAllegation[]> {
    await connectDB();
    return Allegation.find({ tenantId }).sort({ createdAt: -1 });
  }
}
