/**
 * @purpose Proporciona una interfaz de TypeScript para intentos de prueba de quiz serializados.
 * @purpose_en Defines a TypeScript interface for serialized quiz attempts.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1a76g61
 * @lastUpdated 2026-06-23T16:47:28.987Z
 */

export interface SerializedAttempt {
  _id: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: string;
  endedAt?: string;
  status: 'in_progress' | 'completed' | 'timeout';
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: string;
  examConfigId?: {
    _id: string;
    name: string;
    passThreshold: number;
  };
}
