/**
 * @purpose Gestiona interfaces de tipo TypeScript para diversas estructuras de datos utilizadas en la aplicación ABDQuiz, especialmente para el manejo de espacios, cursos, preguntas y conflictos.
 * @purpose_en Defines TypeScript interfaces for various data structures used in the ABDQuiz application, particularly for managing spaces, courses, questions, and conflicts.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:7,imports:0,sig:1ypr4pn
 * @lastUpdated 2026-06-23T19:48:14.295Z
 */

export interface SpaceOption {
  _id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
}

export interface CourseOption {
  _id: string;
  name: string;
  active: boolean;
}

export interface RawQuestion {
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  modulo?: string;
  fuente?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  explicacion?: string;
}

export interface ConflictQuestion {
  index: number;
  pregunta: string;
  spaceId?: string;
  courseId?: string;
  errorType?: string;
  spaceName?: string;
  courseName?: string;
}

export interface ConflictPair {
  indexA: number;
  indexB: number;
  level: 2 | 3;
  similarityScore?: number;
  textA: string;
  textB: string;
}

export interface ResolvedConflict {
  pairIndex: number;
  action: 'keep_both' | 'skip_second';
}

export interface BulkData {
  modulo: string;
  fuente: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
