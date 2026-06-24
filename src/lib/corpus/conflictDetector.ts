/**
 * @purpose Gestiona conflictos semánticos dentro de una batch de preguntas para el asistente de ingestión, clasificándolas en niveles de similitud.
 * @purpose_en Detects semantic conflicts within a batch of questions for the ingestion wizard, classifying them into levels of similarity.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:1,sig:9rn6ge
 * @lastUpdated 2026-06-23T23:22:40.348Z
 */

/**
 * Detector de colisiones semánticas intra-lote para el wizard de ingesta.
 *
 * Niveles de colisión:
 *   Nivel 1 — Duplicidad absoluta (contentHash) → detectado en CorpusImporter
 *   Nivel 2 — Mismo texto normalizado, opciones diferentes (questionTextHash match)
 *   Nivel 3 — Texto similar pero no idéntico (coeficiente Dice sobre bigramas)
 */

import { flattenText } from './normalize';

// ──────────────────────────────────────────────
//  Tipos públicos
// ──────────────────────────────────────────────

export interface ConflictPair {
  /** Índices dentro del array de preguntas */
  indexA: number;
  indexB: number;
  /** Nivel de colisión: 2 (mismo texto, distintas opciones) | 3 (texto similar) */
  level: 2 | 3;
  /** Puntuación de similitud (0..1) — para nivel 3 */
  similarityScore?: number;
  /** Texto de ambas preguntas para mostrar en UI */
  textA: string;
  textB: string;
}

export interface ConflictDetectionResult {
  conflicts: ConflictPair[];
  stats: {
    totalChecked: number;
    level2Count: number;
    level3Count: number;
  };
}

// ──────────────────────────────────────────────
//  Normalización para comparación de textos
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
//  Similitud textual (Dice coefficient sobre bigramas)
// ──────────────────────────────────────────────

function bigramDice(a: string, b: string): number {
  const normA = flattenText(a);
  const normB = flattenText(b);

  if (normA === normB) return 1.0;
  if (normA.length < 2 || normB.length < 2) return 0.0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < normA.length - 1; i++) {
    const bg = normA.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < normB.length - 1; i++) {
    const bg = normB.slice(i, i + 2);
    const count = bigrams.get(bg) ?? 0;
    if (count > 0) {
      bigrams.set(bg, count - 1);
      intersection++;
    }
  }

  const totalBigrams = normA.length - 1 + normB.length - 1;
  return totalBigrams > 0 ? (2 * intersection) / totalBigrams : 0;
}

// ──────────────────────────────────────────────
//  Detector principal
// ──────────────────────────────────────────────

/**
 * Detecta colisiones semánticas dentro de un lote de preguntas.
 *
 * @param questions Lista de preguntas a analizar
 * @param threshold Umbral de similitud Dice para nivel 3 (0..1). Por defecto 0.75
 * @returns Pares de conflictos detectados + estadísticas
 */
export function detectBatchConflicts(
  questions: { pregunta: string; opciones?: string[] }[],
  threshold = 0.75
): ConflictDetectionResult {
  const n = questions.length;
  if (n < 2) return { conflicts: [], stats: { totalChecked: 0, level2Count: 0, level3Count: 0 } };

  // Pre-calcular textos normalizados para nivel 2
  const normalizedTexts: string[] = questions.map(q => flattenText(q.pregunta));

  const conflicts: ConflictPair[] = [];
  const resolved = new Set<string>(); // "i,j" con i < j para evitar duplicados

  const addIfNew = (i: number, j: number, pair: ConflictPair) => {
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    if (!resolved.has(key)) {
      resolved.add(key);
      conflicts.push(pair);
    }
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Nivel 2: mismo texto normalizado
      if (normalizedTexts[i] === normalizedTexts[j]) {
        addIfNew(i, j, {
          indexA: i,
          indexB: j,
          level: 2,
          textA: questions[i].pregunta,
          textB: questions[j].pregunta,
        });
        continue; // No buscar nivel 3 si ya hay nivel 2
      }

      // Nivel 3: texto similar pero no idéntico
      const score = bigramDice(questions[i].pregunta, questions[j].pregunta);
      if (score >= threshold) {
        addIfNew(i, j, {
          indexA: i,
          indexB: j,
          level: 3,
          similarityScore: score,
          textA: questions[i].pregunta,
          textB: questions[j].pregunta,
        });
      }
    }
  }

  return {
    conflicts,
    stats: {
      totalChecked: (n * (n - 1)) / 2,
      level2Count: conflicts.filter(c => c.level === 2).length,
      level3Count: conflicts.filter(c => c.level === 3).length,
    },
  };
}
