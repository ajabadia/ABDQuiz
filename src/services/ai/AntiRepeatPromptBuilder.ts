/**
 * @purpose Gestiona instrucciones del sistema para evitar respuestas duplicadas en contenido generado por IA, usando plantillas configurables.
 * @purpose_en Generates system instructions to prevent duplicate prompts in AI-generated content, using configurable templates.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:2dd8zt
 * @lastUpdated 2026-06-24T11:30:00.000Z
 */

import Question from '../../models/Question';
import { getActivePrompt, renderPromptTemplate } from '@/services/ai/promptService';

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

    const resolved = await getActivePrompt(tenantId, 'anti_repeat');

    const listText = questions.length > 0
      ? questions.map((q, idx) => `${idx + 1}. "${q.questionText}"`).join('\n')
      : 'No hay preguntas previas cargadas en este bloque/módulo.';

    const instructionsText = questions.length === 0
      ? `INSTRUCCIONES ANTI-REPETICIÓN: No hay preguntas previas cargadas en este bloque/módulo. Puedes generar libremente cualquier reactivo correspondiente al temario.`
      : `INSTRUCCIONES DE EXCLUSIÓN ANTI-REPETICIÓN (MUY IMPORTANTE):
Ya existen las siguientes preguntas en el banco de exámenes. Debes generar reactivos completamente nuevos, tanto en su planteamiento conceptual como en su redacción.
Queda ESTRICTAMENTE PROHIBIDO repetir o parafrasear los siguientes enunciados:

${listText}

Genera únicamente preguntas con enfoques alternativos, distractores diferentes y escenarios prácticos no cubiertos en la lista anterior.`;

    return renderPromptTemplate(resolved.userPromptTemplate, {
      instructions: instructionsText,
      listText,
      module,
      questionCount: String(questions.length),
    });
  }
}
