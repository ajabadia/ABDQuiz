/**
 * @purpose Gestiona hashes semánticos para preguntas y opciones para asegurar una identificación consistente en diferentes instancias.
 * @purpose_en Calculates semantic hashes for questions and their options to ensure consistent identification across different instances.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:3,sig:1le4zbe
 * @lastUpdated 2026-06-23T23:22:44.891Z
 */

import { createHash } from 'crypto';
import { flattenText } from './normalize';
import { type IngestQuestion } from '../validation/corpusSchema';

export interface SemanticHashResult {
  questionTextHash: string;
  optionHashes: string[];
  contentHash: string;
}

/**
 * Calcula de manera determinista los hashes semánticos individuales y el maestro
 * para una pregunta y sus opciones.
 */
export function calculateSemanticHashes(
  pregunta: string,
  opciones: string[],
  respuestaCorrecta: number
): SemanticHashResult {
  const sha256 = (str: string) => createHash('sha256').update(str).digest('hex');
  
  const questionTextHash = sha256(flattenText(pregunta));
  const optionHashes = opciones.map(opt => sha256(flattenText(opt)));
  
  // Ordenar matemáticamente de mayor a menor en valor hexadecimal
  const sortedOptionHashes = [...optionHashes].sort((a, b) => b.localeCompare(a));
  
  // H_maestro = SHA-256(H_pregunta || Sorted(H_opcion1, H_opcion2, ...) || RespuestaCorrecta)
  const contentHash = sha256(questionTextHash + sortedOptionHashes.join('') + String(respuestaCorrecta));
  
  return {
    questionTextHash,
    optionHashes,
    contentHash
  };
}

/**
 * Genera el hash maestro determinista para compatibilidad con la API existente
 */
export function generateQuestionHash(q: IngestQuestion): string {
  return calculateSemanticHashes(q.pregunta, q.opciones, q.respuesta_correcta).contentHash;
}

