import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, FeedbackParams, FeedbackResult } from '../types';

function buildPrompt(params: FeedbackParams): string {
  const { questionText, studentAnswer, options, correctAnswer, questionType, isCorrect } = params;

  let prompt = `Eres un tutor de IA especializado en proporcionar feedback educativo constructivo y detallado.

## Pregunta
${questionText}`;

  if (questionType === 'multiple_choice' && options) {
    prompt += `\n\n## Opciones disponibles
${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`;
    if (correctAnswer) {
      prompt += `\n\n## Respuesta correcta
${correctAnswer}`;
    }
  }

  prompt += `\n\n## Respuesta del alumno
${studentAnswer || '(No respondió)'}`;

  if (isCorrect !== undefined) {
    prompt += `\n\n## Resultado
${isCorrect ? 'CORRECTO' : 'INCORRECTO'}`;
  }

  prompt += `\n\n## Instrucciones para el feedback
Proporciona un feedback útil y constructivo en español (máximo 3 párrafos):
1. Explica por qué la respuesta es correcta o incorrecta de forma clara y educativa.
2. Señala los conceptos clave que el alumno debe comprender.
3. Si es incorrecto, da una pista o sugerencia sobre cómo abordar la pregunta correctamente.
${questionType === 'open_text' ? '4. Para preguntas de desarrollo: valora la completitud, precisión y estructura de la respuesta.' : ''}

Mantén un tono alentador y profesional. No reveles la respuesta correcta explícitamente a menos que sea necesario para el aprendizaje.`;

  return prompt;
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateFeedback(params: FeedbackParams): Promise<FeedbackResult> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const prompt = buildPrompt(params);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return { feedback: text.trim() };
  }
}
