/**
 * @purpose Gestiona instrucciones del sistema para que los profesores eviten respuestas duplicadas en el contenido generado por inteligencia artificial.
 * @purpose_en Generates system instructions for teachers to prevent duplicate prompts in AI-generated content.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1ccbjtt
 * @lastUpdated 2026-06-23T23:23:29.554Z
 */

import Question from '../../models/Question';

interface BuildAntiRepeatPromptParams {
  tenantId: string;
  module: string;
  objective?: number;
  limit?: number;
}

export class AntiRepeatPromptBuilder {
  /**
   * Genera el bloque de instrucciones anti-repetición con el listado de enunciados existentes.
   */
  static async buildPrompt({
    tenantId,
    module,
    objective,
    limit = 50
  }: BuildAntiRepeatPromptParams): Promise<string> {
    const query: any = {
      tenantId,
      module,
      active: true
    };

    if (objective !== undefined) {
      query.objective = objective;
    }

    const questions = await Question.find(query)
      .select('questionText')
      .limit(limit)
      .lean();

    if (questions.length === 0) {
      return `INSTRUCCIONES ANTI-REPETICIÓN: No hay preguntas previas cargadas en este bloque/módulo. Puedes generar libremente cualquier reactivo correspondiente al temario.`;
    }

    const listText = questions
      .map((q, idx) => `${idx + 1}. "${q.questionText}"`)
      .join('\n');

    return `INSTRUCCIONES DE EXCLUSIÓN ANTI-REPETICIÓN (MUY IMPORTANTE):
Ya existen las siguientes preguntas en el banco de exámenes. Debes generar reactivos completamente nuevos, tanto en su planteamiento conceptual como en su redacción.
Queda ESTRICTAMENTE PROHIBIDO repetir o parafrasear los siguientes enunciados:

${listText}

Genera únicamente preguntas con enfoques alternativos, distractores diferentes y escenarios prácticos no cubiertos en la lista anterior.`;
  }
}
