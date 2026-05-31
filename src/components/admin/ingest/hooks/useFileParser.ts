'use client';

import Papa from 'papaparse';
import type { RawQuestion, WizardState } from './useIngestWizard';

export function mapDifficulty(val: string): 'easy' | 'medium' | 'hard' {
  const str = val.toLowerCase().trim();
  if (str.includes('fac') || str.includes('eas') || str === '1' || str.includes('baj')) return 'easy';
  if (str.includes('dif') || str.includes('har') || str === '3' || str.includes('alt')) return 'hard';
  return 'medium';
}

function mapResponseToIndex(resp: string | number): number {
  if (typeof resp === 'number') return resp;
  if (typeof resp === 'string') {
    const match = resp.trim().match(/^([A-F])/i);
    if (match) {
      const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
      return map[match[1].toUpperCase()] ?? -1;
    }
  }
  return -1;
}

export function parseFileContent(content: string, type: 'json' | 'csv'): RawQuestion[] {
  let parsedList: RawQuestion[] = [];

  if (type === 'json') {
    const data = JSON.parse(content);
    parsedList = Array.isArray(data) ? data : [data];
  } else {
    const parseResult = Papa.parse<Record<string, unknown>>(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    if (parseResult.errors.length > 0) throw new Error(parseResult.errors[0].message);

    parsedList = parseResult.data.map(row => ({
      pregunta: String(row.pregunta || ''),
      opciones: [row.opcion_a, row.opcion_b, row.opcion_c, row.opcion_d, row.opcion_e, row.opcion_f]
        .map(String)
        .filter(Boolean),
      respuesta_correcta: mapResponseToIndex(String(row.respuesta_correcta || 0)),
      explicacion: String(row.explicacion || ''),
      modulo: String(row.modulo || row.tema || row.category || ''),
      fuente: String(row.fuente || row.source || ''),
      difficulty: mapDifficulty(String(row.difficulty || row.dificultad || row.nivel || '')),
      spaceId: String(row.spaceId || ''),
      courseId: String(row.courseId || ''),
      loadedAt: String(row.loadedAt || ''),
      generatedAt: String(row.generatedAt || ''),
      importVersion: String(row.importVersion || ''),
    }));
  }

  return parsedList.map(q => ({
    pregunta: q.pregunta || '',
    opciones: q.opciones || [],
    respuesta_correcta: q.respuesta_correcta || 0,
    explicacion: q.explicacion || '',
    modulo: q.modulo || '',
    fuente: q.fuente || '',
    difficulty: q.difficulty || 'medium',
    spaceId: q.spaceId || undefined,
    courseId: q.courseId || undefined,
    loadedAt: q.loadedAt || undefined,
    generatedAt: q.generatedAt || undefined,
    importVersion: q.importVersion || undefined,
  }));
}

export function isQuestionIncomplete(q: RawQuestion): boolean {
  return (
    !q.modulo ||
    q.modulo.trim() === '' ||
    !q.fuente ||
    q.fuente.trim() === '' ||
    !q.difficulty ||
    !['easy', 'medium', 'hard'].includes(q.difficulty)
  );
}

export function calcIncompleteIndices(qs: RawQuestion[]): number[] {
  const idxs: number[] = [];
  qs.forEach((q, i) => {
    if (isQuestionIncomplete(q)) idxs.push(i);
  });
  return idxs;
}
