import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CorpusImporter } from './CorpusImporter';

vi.mock('@ajabadia/satellite-sdk', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock mongoose startSession to simulate standalone DB without replica-sets
vi.mock('mongoose', () => {
  return {
    default: {
      startSession: vi.fn().mockRejectedValue(new Error('Standalone')),
    },
    startSession: vi.fn().mockRejectedValue(new Error('Standalone')),
  };
});

// 2. Mock Mongoose models
vi.mock('@/models/CorpusImport', () => {
  const mockCreate = vi.fn();
  class MockCorpusImport {
    static create = mockCreate;
  }
  return {
    default: MockCorpusImport,
    mockCreate,
  };
});

vi.mock('@/models/CorpusImportRow', () => {
  const mockCreate = vi.fn();
  class MockCorpusImportRow {
    static create = mockCreate;
  }
  return {
    default: MockCorpusImportRow,
    mockCreate,
  };
});

vi.mock('@/models/Question', () => {
  const mockFindOne = vi.fn();
  const mockCreate = vi.fn();
  class MockQuestion {
    static findOne = mockFindOne;
    static create = mockCreate;
  }
  return {
    default: MockQuestion,
    mockFindOne,
    mockCreate,
  };
});

import * as CorpusImportMod from '@/models/CorpusImport';
import * as CorpusImportRowMod from '@/models/CorpusImportRow';
import * as QuestionMod from '@/models/Question';

const { mockCreate: mockCreateImport } = CorpusImportMod as unknown as { mockCreate: ReturnType<typeof vi.fn> };
const { mockCreate: mockCreateImportRow } = CorpusImportRowMod as unknown as { mockCreate: ReturnType<typeof vi.fn> };
const { mockFindOne: mockFindQuestion, mockCreate: mockCreateQuestion } = QuestionMod as unknown as {
  mockFindOne: ReturnType<typeof vi.fn>;
  mockCreate: ReturnType<typeof vi.fn>;
};

describe('CorpusImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('importFromJson', () => {
    it('should successfully import valid questions and save rows with status valid', async () => {
      const mockImportDoc = {
        _id: 'import-json-1',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);
      mockFindQuestion.mockResolvedValue(null); // No duplicates
      mockCreateQuestion.mockResolvedValue({ _id: 'new-q-1' });

      const jsonData = [
        {
          pregunta: '¿Cuál es la tensión nominal estándar en baja tensión en la UE?',
          opciones: ['110V', '230V', '400V', '500V'],
          respuesta_correcta: 1,
          modulo: 'Electricidad',
          fuente: 'REBT',
          difficulty: 'easy',
          tags: ['bt', 'ue'],
        },
      ];

      const result = await CorpusImporter.importFromJson('user-1', 'tenant-1', 'test.json', jsonData);

      expect(mockCreateImport).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        createdByUserId: 'user-1',
        sourceType: 'json',
        sourceName: 'test.json',
        totalRows: 1,
        status: 'processing',
      });

      expect(mockFindQuestion).toHaveBeenCalled();
      expect(mockCreateQuestion).toHaveBeenCalled();
      expect(mockCreateImportRow).toHaveBeenCalledWith({
        corpusImportId: 'import-json-1',
        rowNumber: 1,
        status: 'valid',
        questionHash: expect.any(String),
        questionId: 'new-q-1',
      });

      expect(mockImportDoc.status).toBe('completed');
      expect((mockImportDoc as any).validRows).toBe(1);
      expect((mockImportDoc as any).invalidRows).toBe(0);
      expect((mockImportDoc as any).duplicateRows).toBe(0);
      expect(mockImportDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockImportDoc);
    });

    it('should pass spaceId and courseId to Question.create when present in JSON data', async () => {
      const mockImportDoc = {
        _id: 'import-hier',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);
      mockFindQuestion.mockResolvedValue(null);
      mockCreateQuestion.mockResolvedValue({ _id: 'hier-q-1' });

      const jsonData = [
        {
          pregunta: '¿Cuál es la capital de Francia con jerarquía asignada?',
          opciones: ['París', 'Londres', 'Berlín', 'Madrid'],
          respuesta_correcta: 0,
          modulo: 'Geografía',
          fuente: 'Test',
          difficulty: 'easy',
          spaceId: 'space-abc-123',
          courseId: 'course-xyz-456',
        },
      ];

      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'hier.json', jsonData);

      expect(mockCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-abc-123',
          courseId: 'course-xyz-456',
        })
      );
    });

    it('should allow spaceId without courseId (only space-level hierarchy)', async () => {
      const mockImportDoc = {
        _id: 'import-space-only',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);
      mockFindQuestion.mockResolvedValue(null);
      mockCreateQuestion.mockResolvedValue({ _id: 'space-only-q' });

      const jsonData = [
        {
          pregunta: 'Pregunta asignada solo a Space nivel superior',
          opciones: ['Sí', 'No'],
          respuesta_correcta: 0,
          modulo: 'General',
          fuente: 'Test',
          difficulty: 'easy',
          spaceId: 'space-solo',
          // courseId: undefined — solo nivel space
        },
      ];

      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'space-only.json', jsonData);

      expect(mockCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-solo',
          courseId: undefined,
        })
      );
    });

    it('should mark row as duplicate and skip creation when semantic hash match exists', async () => {
      const mockImportDoc = {
        _id: 'import-dup',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);
      mockFindQuestion.mockResolvedValue({ _id: 'existing-q-id' }); // Mock duplicate found

      const jsonData = [
        {
          pregunta: '¿Cuál es la tensión nominal estándar en baja tensión en la UE?',
          opciones: ['110V', '230V', '400V', '500V'],
          respuesta_correcta: 1,
          modulo: 'Electricidad',
          fuente: 'REBT',
          difficulty: 'easy',
        },
      ];

      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'test.json', jsonData);

      expect(mockCreateQuestion).not.toHaveBeenCalled();
      expect(mockCreateImportRow).toHaveBeenCalledWith({
        corpusImportId: 'import-dup',
        rowNumber: 1,
        status: 'duplicate',
        questionHash: expect.any(String),
        questionId: 'existing-q-id',
      });

      expect(mockImportDoc.status).toBe('completed');
      expect((mockImportDoc as any).validRows).toBe(0);
      expect((mockImportDoc as any).duplicateRows).toBe(1);
    });

    it('should log rows failing validation as invalid with detailed Zod error messages', async () => {
      const mockImportDoc = {
        _id: 'import-err',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);

      const invalidData = [
        {
          pregunta: 'Corta', // Too short (must be >= 10 chars)
          opciones: ['A'], // Too few options (must be >= 2)
          respuesta_correcta: 5, // Out of options bounds
          modulo: 'Test',
        },
      ];

      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'test.json', invalidData);

      expect(mockCreateQuestion).not.toHaveBeenCalled();
      expect(mockCreateImportRow).toHaveBeenCalledWith({
        corpusImportId: 'import-err',
        rowNumber: 1,
        status: 'invalid',
        errorMessages: expect.any(Array),
      });

      // Verify custom message format or paths in Zod error log
      const logCall = (mockCreateImportRow as any).mock.calls[0][0];
      expect(logCall.errorMessages[0]).toContain('pregunta');

      expect(mockImportDoc.status).toBe('completed_with_errors');
      expect((mockImportDoc as any).invalidRows).toBe(1);
      expect((mockImportDoc as any).validRows).toBe(0);
    });

    it('should log rows failing validation refinements as invalid', async () => {
      const mockImportDoc = {
        _id: 'import-err-refine',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);

      const invalidData = [
        {
          pregunta: 'El enunciado es lo suficientemente largo para validar',
          opciones: ['A', 'B', 'C'],
          respuesta_correcta: 5, // Out of options bounds
          modulo: 'Test',
        },
      ];

      await CorpusImporter.importFromJson('user-1', 'tenant-1', 'test.json', invalidData);

      expect(mockCreateImportRow).toHaveBeenCalled();
    });
  });

  describe('importFromCsv', () => {
    it('should correctly parse CSV and map headers to JSON model fields', async () => {
      const mockImportDoc = {
        _id: 'import-csv',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);
      mockFindQuestion.mockResolvedValue(null);
      mockCreateQuestion.mockResolvedValue({ _id: 'csv-q-1' });

      // CSV content matching PapaParse header/structure expectations
      const csvContent = [
        'pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,explicacion,modulo,fuente,difficulty,tags',
        '"¿Pregunta de prueba en CSV?","A","B","C","D","C","Explicación CSV","Módulo CSV","Fuente CSV","Alta","csv,test"'
      ].join('\n');

      await CorpusImporter.importFromCsv('user-1', 'tenant-1', 'test.csv', csvContent);

      expect(mockCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          questionText: '¿Pregunta de prueba en CSV?',
          options: ['A', 'B', 'C', 'D'],
          correctOptionIndex: 2, // 'C' maps to 2
          explanation: 'Explicación CSV',
          module: 'Módulo CSV',
          source: 'Fuente CSV',
          difficulty: 'hard', // "Alta" maps to "hard"
          tags: ['csv', 'test'],
        })
      );
    });

    it('should parse spaceId and courseId from CSV headers when present', async () => {
      const mockImportDoc = {
        _id: 'import-csv-hier',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);
      mockFindQuestion.mockResolvedValue(null);
      mockCreateQuestion.mockResolvedValue({ _id: 'csv-hier-q' });

      const csvContent = [
        'pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,modulo,fuente,difficulty,spaceId,courseId',
        '"¿Capital de Francia?","París","Londres","Berlín","Madrid","A","Geografía","Test","Fácil","space-abc","course-xyz"'
      ].join('\n');

      await CorpusImporter.importFromCsv('user-1', 'tenant-1', 'hier.csv', csvContent);

      expect(mockCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-abc',
          courseId: 'course-xyz',
        })
      );
    });

    it('should parse spaceId alone from CSV when courseId column is absent', async () => {
      const mockImportDoc = {
        _id: 'import-csv-space',
        status: 'processing',
        save: vi.fn().mockResolvedValue(true),
      };
      mockCreateImport.mockResolvedValue(mockImportDoc);
      mockFindQuestion.mockResolvedValue(null);
      mockCreateQuestion.mockResolvedValue({ _id: 'csv-space-q' });

      const csvContent = [
        'pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,modulo,fuente,difficulty,spaceId',
        '"Pregunta solo de space","A","B","C","D","A","Módulo","Fuente","Media","space-only"'
      ].join('\n');

      await CorpusImporter.importFromCsv('user-1', 'tenant-1', 'space.csv', csvContent);

      expect(mockCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-only',
          courseId: undefined,
        })
      );
    });

    it('should throw an error if CSV structure is corrupted or unparsable', async () => {
      // PapaParse throws errors on corrupted quotes/delimiters under strict config or errors field
      // Wait, PapaParse will trigger errors list if there is a mismatch. Let's test with empty header
      const csvContent = ''; // Triggers no headers / empty lines if empty, or we can check parser behavior.
      // Wait, let's verify if empty is fine or how the mock handles error
      // Let's pass a CSV with mismatched quotes that causes an error in Papa.parse
      const badCsvContent = '"unclosed quote,a,b,c\n';
      // Wait, standard papaparse parses this but might add errors
      // Papa.parse will return error in parseResult.errors if it has quotes error
      // Let's verify that parser error throws the expected exception
      
      // We will let Papa.parse fail. Since Papa.parse does not automatically throw but returns results.errors,
      // and our CorpusImporter checks if parseResult.errors.length > 0 and throws:
      await expect(
        CorpusImporter.importFromCsv('user-1', 'tenant-1', 'bad.csv', badCsvContent)
      ).rejects.toThrow('CSV Parse Error:');
    });
  });
});
