import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CorpusImporter } from './CorpusImporter';

// ── Mocks (hoisted by vitest) ───────────────
vi.mock('@ajabadia/satellite-sdk/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

vi.mock('mongoose', () => ({
  default: { startSession: vi.fn().mockRejectedValue(new Error('Standalone')) },
  startSession: vi.fn().mockRejectedValue(new Error('Standalone')),
}));

vi.mock('@/models/CorpusImport', () => {
  const mockCreate = vi.fn();
  class MockCorpusImport { static create = mockCreate; }
  return { default: MockCorpusImport, mockCreate };
});

vi.mock('@/models/CorpusImportRow', () => {
  const mockCreate = vi.fn();
  class MockCorpusImportRow { static create = mockCreate; }
  return { default: MockCorpusImportRow, mockCreate };
});

vi.mock('@/models/Question', () => {
  const mockFindOne = vi.fn();
  const mockCreate = vi.fn();
  class MockQuestion { static findOne = mockFindOne; static create = mockCreate; }
  return { default: MockQuestion, mockFindOne, mockCreate };
});

import * as CorpusImportMod from '@/models/CorpusImport';
import * as CorpusImportRowMod from '@/models/CorpusImportRow';
import * as QuestionMod from '@/models/Question';

const { mockCreate: mockCreateImport } = CorpusImportMod as unknown as any;
const { mockCreate: mockCreateImportRow } = CorpusImportRowMod as unknown as any;
const { mockFindOne: mockFindQuestion, mockCreate: mockCreateQuestion } = QuestionMod as unknown as any;

function makeImportDoc(overrides: Record<string, unknown> = {}) {
  return { _id: 'import-1', status: 'processing', duplicateRows: 0, save: vi.fn().mockResolvedValue(true), ...overrides };
}

function makeValidQuestion(overrides: Record<string, unknown> = {}) {
  return {
    pregunta: '¿Tensión nominal BT en UE?',
    opciones: ['110V', '230V', '400V', '500V'],
    respuesta_correcta: 1,
    modulo: 'Electricidad',
    fuente: 'REBT',
    difficulty: 'easy',
    tags: ['bt'],
    ...overrides,
  };
}

describe('CorpusImporter', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('importFromJson', () => {
    it('should import valid questions', async () => {
      const doc = makeImportDoc();
      mockCreateImport.mockResolvedValue(doc);
      mockFindQuestion.mockResolvedValue(null);
      mockCreateQuestion.mockResolvedValue({ _id: 'new-q-1' });
      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'test.json', [makeValidQuestion()]);
      expect(mockCreateQuestion).toHaveBeenCalled();
      expect(doc.status).toBe('completed');
    });

    it('should pass spaceId and courseId to Question.create', async () => {
      const doc = makeImportDoc(); mockCreateImport.mockResolvedValue(doc);
      mockFindQuestion.mockResolvedValue(null); mockCreateQuestion.mockResolvedValue({ _id: 'hier-q' });
      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'hier.json', [makeValidQuestion({ spaceId: 'space-abc', courseId: 'course-xyz' })]);
      expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'space-abc', courseId: 'course-xyz' }));
    });

    it('should allow spaceId without courseId', async () => {
      const doc = makeImportDoc(); mockCreateImport.mockResolvedValue(doc);
      mockFindQuestion.mockResolvedValue(null); mockCreateQuestion.mockResolvedValue({ _id: 'sq' });
      await CorpusImporter.importFromJson('user-1', 'tenant-1', 's.json', [makeValidQuestion({ spaceId: 'solo', courseId: undefined })]);
      expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'solo', courseId: undefined }));
    });

    it('should mark duplicates', async () => {
      const doc = makeImportDoc(); mockCreateImport.mockResolvedValue(doc);
      mockFindQuestion.mockResolvedValue({ _id: 'existing-q' });
      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'test.json', [makeValidQuestion()]);
      expect(mockCreateQuestion).not.toHaveBeenCalled();
      expect(doc.duplicateRows).toBe(1);
    });

    it('should log invalid rows', async () => {
      const doc = makeImportDoc(); mockCreateImport.mockResolvedValue(doc);
      const invalidData = [{ pregunta: 'Corta', opciones: ['A'], respuesta_correcta: 5, modulo: 'Test' }];
      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'test.json', invalidData);
      expect(mockCreateQuestion).not.toHaveBeenCalled();
      expect(doc.status).toBe('completed_with_errors');
    });
  });

  describe('importFromCsv', () => {
    it('should parse CSV and map headers', async () => {
      const doc = makeImportDoc(); mockCreateImport.mockResolvedValue(doc);
      mockFindQuestion.mockResolvedValue(null); mockCreateQuestion.mockResolvedValue({ _id: 'csv-q' });
      const csv = 'pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,explicacion,modulo,fuente,difficulty,tags\n"¿Pregunta CSV?","A","B","C","D","C","Exp","Mod","Src","Alta","csv,test"';
      await CorpusImporter.importFromCsv('user-1', 'tenant-1', 't.csv', csv);
      expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ questionText: '¿Pregunta CSV?', difficulty: 'hard' }));
    });

    it('should parse spaceId/courseId from CSV', async () => {
      const doc = makeImportDoc(); mockCreateImport.mockResolvedValue(doc);
      mockFindQuestion.mockResolvedValue(null); mockCreateQuestion.mockResolvedValue({ _id: 'cv' });
      const csv = 'pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,modulo,fuente,difficulty,spaceId,courseId\n"¿Pregunta CSV con espacio?", "A","B","C","D","A","Mod","Src","Fácil","sp-1","co-1"';
      await CorpusImporter.importFromCsv('user-1', 'tenant-1', 'h.csv', csv);
      expect(mockCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'sp-1', courseId: 'co-1' }));
    });

    it('should throw on bad CSV', async () => {
      await expect(CorpusImporter.importFromCsv('u1', 't1', 'b.csv', '"unclosed')).rejects.toThrow('CSV Parse Error:');
    });
  });
});
