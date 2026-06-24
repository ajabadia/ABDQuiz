/**
 * @purpose Proporciona retroalimentación educativa a los estudiantes basada en sus respuestas a preguntas utilizando el modelo AI Gemini y plantillas configurables.
 * @purpose_en Generates educational feedback for students based on their answers to questions using Gemini AI and configurable prompt templates.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:6dm8zt
 * @lastUpdated 2026-06-24T11:30:00.000Z
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, FeedbackParams, FeedbackResult } from '../types';
import { getActivePrompt, renderPromptTemplate } from '@/services/ai/promptService';

function buildParams(params: FeedbackParams): Record<string, string> {
  const { questionText, studentAnswer, options, correctAnswer, questionType, isCorrect } = params;

  const optionsText = options
    ? options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')
    : '';

  const correctAnswerText = correctAnswer || '';

  const isCorrectText = isCorrect !== undefined ? (isCorrect ? 'CORRECTO' : 'INCORRECTO') : '';

  const openTextInstruction = questionType === 'open_text'
    ? '4. Para preguntas de desarrollo: valora la completitud, precisión y estructura de la respuesta.'
    : '';

  return {
    questionText,
    options: optionsText,
    correctAnswer: correctAnswerText,
    studentAnswer: studentAnswer || '(No respondió)',
    isCorrect: isCorrectText,
    openTextInstruction,
  };
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;
  private tenantId: string;

  constructor(tenantId: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.tenantId = tenantId;
  }

  async generateFeedback(params: FeedbackParams): Promise<FeedbackResult> {
    const resolved = await getActivePrompt(this.tenantId, 'feedback_generation');

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: resolved.systemPrompt,
      generationConfig: {
        temperature: resolved.temperature,
        maxOutputTokens: 500,
      },
    });

    const templateVars = buildParams(params);
    const rendered = renderPromptTemplate(resolved.userPromptTemplate, templateVars);
    const result = await model.generateContent(rendered);
    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return { feedback: text.trim() };
  }
}
