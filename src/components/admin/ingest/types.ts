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
