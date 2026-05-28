import { describe, it, expect } from 'vitest';
import { detectBatchConflicts } from './conflictDetector';

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function q(text: string, opts?: string[]) {
  return { pregunta: text, opciones: opts ?? ['A', 'B', 'C', 'D'] };
}

// ──────────────────────────────────────────────
//  Nivel 2 — mismo texto normalizado
// ──────────────────────────────────────────────

describe('detectBatchConflicts — Nivel 2 (mismo texto normalizado)', () => {
  it('should detect level 2 when questions have the same normalized text', () => {
    const questions = [
      q('¿Cuál es la capital de Francia?', ['París', 'Londres']),
      q('¿Cual es la capital de francia?', ['Madrid', 'Berlín']), // mismas letras, sin acentos ni signos
    ];
    const result = detectBatchConflicts(questions);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].level).toBe(2);
    expect(result.conflicts[0].indexA).toBe(0);
    expect(result.conflicts[0].indexB).toBe(1);
    expect(result.stats.level2Count).toBe(1);
    expect(result.stats.level3Count).toBe(0);
  });

  it('should detect level 2 ignoring whitespace and punctuation', () => {
    const questions = [
      q('El puerto   por defecto  de HTTPS:'),
      q('El puerto por defecto de HTTPS'), // sin espacios extra, sin dos puntos
    ];
    const result = detectBatchConflicts(questions);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].level).toBe(2);
  });

  it('should treat Ñ and N as equivalent for normalization (level 2)', () => {
    // Verifica que la Ñ se normaliza a N → mismo texto normalizado
    const questions = [
      q('La Ñ es parte del español'),
      q('La N es parte del espanol'),
    ];
    const result = detectBatchConflicts(questions);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].level).toBe(2);
  });

  it('should detect multiple level 2 pairs among several questions', () => {
    const questions = [
      q('¿Cuál es el resultado?'),    // 0
      q('¿Cual es el resultado?'),    // 1 — level 2 con 0
      q('Otra pregunta diferente'),    // 2
      q('¿Cuál es el resultado?'),    // 3 — level 2 con 0 y 1 (detecta 0-3, 1-3)
      q('Otra pregunta diferente'),   // 4 — level 2 con 2
    ];
    const result = detectBatchConflicts(questions);
    // Pares esperados: (0,1), (0,3), (1,3), (2,4)
    expect(result.conflicts.length).toBeGreaterThanOrEqual(3);
    expect(result.conflicts.every(c => c.level === 2)).toBe(true);
    expect(result.stats.level2Count).toBe(result.conflicts.length);
  });
});

// ──────────────────────────────────────────────
//  Nivel 3 — texto similar (Dice coefficient)
// ──────────────────────────────────────────────

describe('detectBatchConflicts — Nivel 3 (texto similar por Dice)', () => {
  it('should detect level 3 for very similar texts (single word difference)', () => {
    const questions = [
      q('¿Cuál es el puerto por defecto de HTTPS?'),
      q('¿Cuál es el puerto por defecto de HTTP?'),
    ];
    const result = detectBatchConflicts(questions);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].level).toBe(3);
    expect(result.conflicts[0].similarityScore).toBeGreaterThanOrEqual(0.75);
  });

  it('should not report completely dissimilar texts as level 3', () => {
    const questions = [
      q('¿Cuál es la capital de Francia?'),
      q('¿Cuánto es 2 + 2?'),
    ];
    const result = detectBatchConflicts(questions, 0.75);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should respect a higher threshold (fewer level 3 hits)', () => {
    const questions = [
      q('¿Cuál es el puerto por defecto de HTTPS?'),
      q('¿Cuál es el puerto por defecto de HTTP?'),
      q('Otra pregunta completamente diferente'),
    ];
    const high = detectBatchConflicts(questions, 0.95);
    const low = detectBatchConflicts(questions, 0.5);
    // Con threshold alto puede que no pase, con bajo sí
    expect(low.conflicts.length).toBeGreaterThanOrEqual(high.conflicts.length);
  });

  it('should detect level 3 with typographical similarity', () => {
    const questions = [
      q('¿Cual es la funcion del sistema operativo?'),
      q('¿Cuál es la funsión del sistema operativo?'), // typo + acento
    ];
    const result = detectBatchConflicts(questions, 0.75);
    // should be level 3 (similar but not identical normalized text)
    const hasLevel3 = result.conflicts.some(c => c.level === 3);
    expect(hasLevel3).toBe(true);
  });
});

// ──────────────────────────────────────────────
//  Prioridad: level 2 > level 3
// ──────────────────────────────────────────────

describe('detectBatchConflicts — prioridad nivel 2 sobre 3', () => {
  it('should report level 2 and NOT level 3 when normalized texts match', () => {
    const questions = [
      q('¿Cuál es la capital de Francia?', ['París', 'Londres']),
      q('¿Cual es la capital de francia?', ['Madrid', 'Berlín']),
    ];
    const result = detectBatchConflicts(questions);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].level).toBe(2);
    // No debe haber también un level 3 para el mismo par
    expect(result.conflicts.filter(c => c.level === 3)).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
//  Edge cases
// ──────────────────────────────────────────────

describe('detectBatchConflicts — edge cases', () => {
  it('should return empty for empty questions array', () => {
    const result = detectBatchConflicts([]);
    expect(result.conflicts).toHaveLength(0);
    expect(result.stats.totalChecked).toBe(0);
  });

  it('should return empty for single question', () => {
    const result = detectBatchConflicts([q('Pregunta única')]);
    expect(result.conflicts).toHaveLength(0);
    expect(result.stats.totalChecked).toBe(0);
  });

  it('should return empty for two completely different questions', () => {
    const result = detectBatchConflicts([
      q('¿Qué es HTML?'),
      q('¿Cuál es la raíz cuadrada de 144?'),
    ]);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should handle questions with empty or very short text', () => {
    const result = detectBatchConflicts([
      q(''),
      q(''),
      q('A'),
    ]);
    // Dos textos vacíos: nivel 2 (ambos se normalizan a string vacío)
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].level).toBe(2);
  });

  it('should handle questions with only punctuation and spaces', () => {
    const result = detectBatchConflicts([
      q('¿?¡!'),
      q('?!¡¿'),
    ]);
    // Ambos se normalizan a string vacío → nivel 2
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].level).toBe(2);
  });

  it('should not report duplicate pairs (no (i,j) and (j,i))', () => {
    const questions = [
      q('¿Qué es el cifrado asimétrico?'),
      q('¿Qué es el cifrado asimétrico?'), // nivel 2 con 0
      q('Otra cosa completamente diferente sin solapamiento'),
    ];
    const result = detectBatchConflicts(questions);
    // Solo debe haber un par: (0,1) — (0,2) y (1,2) son textos muy distintos
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].indexA).toBe(0);
    expect(result.conflicts[0].indexB).toBe(1);
  });
});

// ──────────────────────────────────────────────
//  Estadísticas
// ──────────────────────────────────────────────

describe('detectBatchConflicts — stats', () => {
  it('should report correct totalChecked (pairs examined)', () => {
    const result = detectBatchConflicts([
      q('A'), q('B'), q('C'), q('D'), q('E'),
    ]);
    // C(5,2) = 10
    expect(result.stats.totalChecked).toBe(10);
  });

  it('should correctly separate level2Count and level3Count', () => {
    const questions = [
      q('Pregunta idéntica A'),
      q('Pregunta idéntica A'),       // level 2 con 0
      q('¿Cuál es el puerto HTTPS?'),
      q('¿Cuál es el puerto HTTP?'),  // level 3 con 2
      q('Totalmente diferente'),
    ];
    const result = detectBatchConflicts(questions);
    expect(result.stats.level2Count).toBeGreaterThanOrEqual(1);
    expect(result.stats.level3Count).toBeGreaterThanOrEqual(1);
    expect(result.stats.level2Count + result.stats.level3Count).toBe(result.conflicts.length);
  });
});
