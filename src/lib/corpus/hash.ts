import { createHash } from 'crypto';
import { normalizeString, normalizeOptions } from './normalize';
import { type IngestQuestion } from '../validation/corpusSchema';

/**
 * Genera un hash determinista de una pregunta a partir de su contenido semántico
 */
export function generateQuestionHash(q: IngestQuestion): string {
  // Construimos el objeto semántico normalizado
  const semanticContent = {
    text: normalizeString(q.pregunta),
    options: normalizeOptions(q.opciones),
    correctIndex: q.respuesta_correcta,
    module: normalizeString(q.modulo),
    source: normalizeString(q.fuente)
  };

  // Serializamos a string de forma estable
  const serialized = JSON.stringify(semanticContent);

  // Generamos SHA-256
  return createHash('sha256')
    .update(serialized)
    .digest('hex');
}
