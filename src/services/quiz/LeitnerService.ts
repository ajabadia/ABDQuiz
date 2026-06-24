/**
 * @purpose Gestiona el algoritmo Leitner y servicio para entrenamiento adaptativo del estudiante.
 * @purpose_en Manages the Leitner algorithm and service for adaptive student training.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:bvdpcx
 * @lastUpdated 2026-06-23T23:24:01.635Z
 */

import UserLeitnerState from '../../models/UserLeitnerState';
import Question, { IQuestion } from '../../models/Question';
import mongoose from 'mongoose';

export class LeitnerService {
  /**
   * Actualiza el estado Leitner (Cajas y Rachas) de una pregunta tras ser respondida por el alumno.
   */
  static async updateLeitnerState(
    tenantId: string,
    userId: string,
    questionId: string,
    isCorrect: boolean
  ): Promise<void> {
    const qId = new mongoose.Types.ObjectId(questionId);

    const currentState = await UserLeitnerState.findOne({ userId, questionId: qId });

    if (currentState) {
      if (isCorrect) {
        const newStreak = currentState.streak + 1;
        // Si tiene al menos 1 acierto consecutivo, sube de nivel (máx. 3)
        const newLevel = newStreak >= 1 ? Math.min(3, currentState.level + 1) : currentState.level;
        
        currentState.level = newLevel;
        currentState.streak = newStreak;
      } else {
        // Un fallo devuelve inmediatamente la pregunta a la Caja 1 y racha 0
        currentState.level = 1;
        currentState.streak = 0;
      }
      currentState.lastSeen = new Date();
      await currentState.save();
    } else {
      // Registrar estado inicial
      await UserLeitnerState.create({
        tenantId,
        userId,
        questionId: qId,
        level: isCorrect ? 2 : 1,
        streak: isCorrect ? 1 : 0,
        lastSeen: new Date()
      });
    }
  }

  /**
   * Obtiene preguntas balanceadas por cajas Leitner para una sesión de estudio.
   */
  static async getLeitnerSessionQuestions(
    tenantId: string,
    userId: string,
    moduleName: string,
    limit: number = 20
  ): Promise<IQuestion[]> {
    // 1. Obtener todas las preguntas activas de este módulo
    const activeQuestions = await Question.find({
      tenantId,
      module: moduleName,
      active: true
    }).lean();

    if (activeQuestions.length === 0) return [];

    const qIds = activeQuestions.map(q => q._id);

    // 2. Obtener el estado Leitner del usuario para estas preguntas
    const states = await UserLeitnerState.find({
      userId,
      questionId: { $in: qIds }
    }).lean();

    const stateMap = new Map<string, number>();
    states.forEach(s => {
      stateMap.set(s.questionId.toString(), s.level);
    });

    // 3. Clasificar preguntas en Cajas (1, 2, 3)
    const box1: any[] = [];
    const box2: any[] = [];
    const box3: any[] = [];

    activeQuestions.forEach(q => {
      const level = stateMap.get(q._id.toString()) || 1; // Por defecto Caja 1 si no hay registro
      if (level === 1) box1.push(q);
      else if (level === 2) box2.push(q);
      else box3.push(q);
    });

    // Mezclar cada caja aleatoriamente
    const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);
    shuffle(box1);
    shuffle(box2);
    shuffle(box3);

    // 4. Seleccionar según reparto óptimo: 60% Caja 1, 30% Caja 2, 10% Caja 3
    const countBox1 = Math.round(limit * 0.60);
    const countBox2 = Math.round(limit * 0.30);
    const countBox3 = limit - countBox1 - countBox2;

    const selected: IQuestion[] = [];

    // Tomar de Caja 1
    selected.push(...box1.slice(0, countBox1));
    // Tomar de Caja 2
    selected.push(...box2.slice(0, countBox2));
    // Tomar de Caja 3
    selected.push(...box3.slice(0, countBox3));

    // Si faltan por completar el límite, rellenar con cualquier caja sobrante
    if (selected.length < limit) {
      const remainingPool = [
        ...box1.slice(countBox1),
        ...box2.slice(countBox2),
        ...box3.slice(countBox3)
      ];
      shuffle(remainingPool);
      const needed = limit - selected.length;
      selected.push(...remainingPool.slice(0, needed));
    }

    return selected;
  }
}
