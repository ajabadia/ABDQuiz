/**
 * @purpose Gestiona el recuperado y el renderizado de plantillas de instrucciones con valores por defecto en caso de inaccesibilidad de la base de datos.
 * @purpose_en Manages retrieval and rendering of prompt templates with fallback defaults if the database is unavailable.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:4,imports:2,sig:n5b3ge
 * @lastUpdated 2026-06-24T10:55:39.002Z
 */

import { connectDB } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import PromptTemplate from '@/models/PromptTemplate';

export interface ResolvedPrompt {
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
}

const DEFAULTS: Record<string, ResolvedPrompt> = {
  question_generation: {
    systemPrompt: `Eres un asistente de IA educativa especializado en generar preguntas de examen técnico-industrial. Debes generar preguntas claras, objetivas y alineadas con los objetivos de aprendizaje proporcionados.`,
    userPromptTemplate: `Genera {{count}} preguntas de tipo test sobre {{subject}} en español. Nivel de dificultad: {{level}}. Objetivos: {{objectives}}.`,
    temperature: 0.7,
  },
  feedback_generation: {
    systemPrompt: `Eres un tutor de IA especializado en proporcionar feedback educativo constructivo y detallado.`,
    userPromptTemplate: `## Pregunta
{{questionText}}

## Opciones disponibles
{{options}}

## Respuesta correcta
{{correctAnswer}}

## Respuesta del alumno
{{studentAnswer}}

## Resultado
{{isCorrect}}

## Instrucciones para el feedback
Proporciona un feedback útil y constructivo en español (máximo 3 párrafos):
1. Explica por qué la respuesta es correcta o incorrecta de forma clara y educativa.
2. Señala los conceptos clave que el alumno debe comprender.
3. Si es incorrecto, da una pista o sugerencia sobre cómo abordar la pregunta correctamente.
{{openTextInstruction}}
Mantén un tono alentador y profesional. No reveles la respuesta correcta explícitamente a menos que sea necesario para el aprendizaje.`,
    temperature: 0.7,
  },
  anti_repeat: {
    systemPrompt: `Eres un generador de preguntas de examen. Debes crear reactivos originales que no dupliquen preguntas existentes en el banco.`,
    userPromptTemplate: `{{instructions}}`,
    temperature: 0.3,
  },
};

export async function getActivePrompt(
  tenantId: string,
  name: string
): Promise<ResolvedPrompt> {
  try {
    await connectDB();
    const template = await PromptTemplate.findOne({ name, active: true }).lean();

    if (template) {
      return {
        systemPrompt: template.systemPrompt,
        userPromptTemplate: template.userPromptTemplate,
        temperature: template.temperature ?? 0.7,
      };
    }

    logger.warn(`[PromptService] Template "${name}" not found for tenant ${tenantId}. Using fallback defaults.`);
  } catch (err) {
    logger.error(`[PromptService] Failed to query PromptTemplate for "${name}". Using fallback defaults.`, err);
  }

  const fallback = DEFAULTS[name];
  if (fallback) {
    return { ...fallback };
  }

  return {
    systemPrompt: 'Eres un asistente de IA.',
    userPromptTemplate: '{{input}}',
    temperature: 0.7,
  };
}

export function getDefaultRequiredVariables(name: string): string[] {
  const fallback = DEFAULTS[name];
  if (!fallback) return [];
  const vars: string[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = re.exec(fallback.userPromptTemplate)) !== null) {
    vars.push(match[1]);
  }
  return Array.from(new Set(vars));
}

export function renderPromptTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] || `{{${key}}}`);
}
