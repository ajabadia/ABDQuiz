import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// Mock satellite-sdk database connection and define variables inside factory
vi.mock('@ajabadia/satellite-sdk/db', () => {
  const qFind = vi.fn();
  const ecFindOne = vi.fn();
  const cFindOne = vi.fn();
  const ulsFindOne = vi.fn();
  const ulsFind = vi.fn();
  const ulsCreate = vi.fn();

  (globalThis as any).mockQuestionFind = qFind;
  (globalThis as any).mockExamConfigFindOne = ecFindOne;
  (globalThis as any).mockCourseFindOne = cFindOne;
  (globalThis as any).mockUserLeitnerStateFindOne = ulsFindOne;
  (globalThis as any).mockUserLeitnerStateFind = ulsFind;
  (globalThis as any).mockUserLeitnerStateCreate = ulsCreate;

  return {
    connectDB: vi.fn().mockResolvedValue(undefined),
    getTenantModel: vi.fn((name) => {
      if (name === 'Question') return { find: qFind };
      if (name === 'ExamConfig') return { findOne: ecFindOne };
      if (name === 'Course') return { findOne: cFindOne };
      if (name === 'UserLeitnerState') return {
        findOne: ulsFindOne,
        find: ulsFind,
        create: ulsCreate
      };
    })
  };
});

// Access the mocked functions via globalThis
const mockQuestionFind = (globalThis as any).mockQuestionFind;
const mockExamConfigFindOne = (globalThis as any).mockExamConfigFindOne;
const mockCourseFindOne = (globalThis as any).mockCourseFindOne;
const mockUserLeitnerStateFindOne = (globalThis as any).mockUserLeitnerStateFindOne;
const mockUserLeitnerStateFind = (globalThis as any).mockUserLeitnerStateFind;
const mockUserLeitnerStateCreate = (globalThis as any).mockUserLeitnerStateCreate;

// Import services after mocks
import { AntiRepeatPromptBuilder } from '../ai/AntiRepeatPromptBuilder';
import { ExamAuditorService } from './ExamAuditorService';
import { LeitnerService } from './LeitnerService';

const VALID_QUESTION_ID = '123456789012345678901234';

describe('AntiRepeatPromptBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty/no questions prompt if none found', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      })
    });
    mockQuestionFind.mockReturnValue({ select: mockSelect } as any);

    const prompt = await AntiRepeatPromptBuilder.buildPrompt({
      tenantId: 't1',
      module: 'M1'
    });

    expect(prompt).toContain('No hay preguntas previas');
  });

  it('should list question texts if questions found in DB', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: 'q1', questionText: '¿Qué es un LLM?' },
          { _id: 'q2', questionText: '¿Cómo funciona la tokenización?' }
        ])
      })
    });
    mockQuestionFind.mockReturnValue({ select: mockSelect } as any);

    const prompt = await AntiRepeatPromptBuilder.buildPrompt({
      tenantId: 't1',
      module: 'M1'
    });

    expect(prompt).toContain('¿Qué es un LLM?');
    expect(prompt).toContain('¿Cómo funciona la tokenización?');
    expect(prompt).toContain('Queda ESTRICTAMENTE PROHIBIDO repetir');
  });
});

describe('ExamAuditorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if exam config is not found', async () => {
    mockExamConfigFindOne.mockResolvedValue(null);
    const result = await ExamAuditorService.auditExamCoverage('t1', 'non-existent');
    expect(result).toBeNull();
  });

  it('should return null if no course has objectives', async () => {
    mockExamConfigFindOne.mockResolvedValue({
      _id: 'exam-1',
      name: 'Examen de prueba M1',
      moduleFilter: ['M1'],
      courseId: undefined
    });
    mockCourseFindOne.mockResolvedValue(null);

    const result = await ExamAuditorService.auditExamCoverage('t1', 'exam-1');
    expect(result).toBeNull();
  });

  it('should calculate coverage correctly from course objectives', async () => {
    mockExamConfigFindOne.mockResolvedValue({
      _id: 'exam-1',
      name: 'Examen de prueba M1',
      moduleFilter: ['M1'],
      courseId: undefined
    });
    mockCourseFindOne.mockResolvedValue({
      _id: 'course-1',
      objectives: [
        { module: 'M1', block: '1', objectives: [
          'obj1', 'obj2', 'obj3'
        ]},
        { module: 'M1', block: '2', objectives: [
          'obj4', 'obj5', 'obj6'
        ]},
        { module: 'M1', block: '3', objectives: [
          'obj7', 'obj8', 'obj9'
        ]}
      ]
    });

    const mockQuestions = [
      { _id: 'q1', module: 'M1', objective: 1, questionText: 'Q1', tags: ['M1-1'] },
      { _id: 'q2', module: 'M1', objective: 1, questionText: 'Q2', tags: ['M1-1'] },
      // Objective 2 will be missing (0)
      { _id: 'q3', module: 'M1', objective: 3, questionText: 'Q3', tags: ['M1-1'] }
    ];

    const mockSelect = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockQuestions)
    });
    mockQuestionFind.mockReturnValue({ select: mockSelect } as any);

    const report = await ExamAuditorService.auditExamCoverage('t1', 'exam-1');

    expect(report).toBeDefined();
    expect(report?.examName).toBe('Examen de prueba M1');
    expect(report?.totalObjectives).toBe(9); // 3 blocks * 3 objectives = 9
    expect(report?.coveredObjectives).toBe(2); // Objective 1 and 3 are covered, Objective 2 has 0
    expect(report?.coveragePercentage).toBe(Math.round((2 / 9) * 100));
    
    const obj1 = report?.details.find(d => d.block === '1' && d.objectiveIndex === 1);
    expect(obj1?.questionCount).toBe(2);
    expect(obj1?.status).toBe('scarce');

    const obj2 = report?.details.find(d => d.block === '1' && d.objectiveIndex === 2);
    expect(obj2?.questionCount).toBe(0);
    expect(obj2?.status).toBe('missing');
  });
});

describe('LeitnerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateLeitnerState', () => {
    it('should create initial state with level 2 on correct first attempt', async () => {
      mockUserLeitnerStateFindOne.mockResolvedValue(null);

      await LeitnerService.updateLeitnerState('t1', 'user-1', VALID_QUESTION_ID, true);

      expect(mockUserLeitnerStateCreate).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 't1',
        userId: 'user-1',
        level: 2,
        streak: 1
      }));
    });

    it('should create initial state with level 1 on incorrect first attempt', async () => {
      mockUserLeitnerStateFindOne.mockResolvedValue(null);

      await LeitnerService.updateLeitnerState('t1', 'user-1', VALID_QUESTION_ID, false);

      expect(mockUserLeitnerStateCreate).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 't1',
        userId: 'user-1',
        level: 1,
        streak: 0
      }));
    });

    it('should upgrade level and streak on correct subsequent answer', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockState = {
        level: 1,
        streak: 0,
        lastSeen: new Date(),
        save: mockSave
      };
      mockUserLeitnerStateFindOne.mockResolvedValue(mockState);

      await LeitnerService.updateLeitnerState('t1', 'user-1', VALID_QUESTION_ID, true);

      expect(mockState.level).toBe(2);
      expect(mockState.streak).toBe(1);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should reset level to 1 on incorrect answer', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockState = {
        level: 3,
        streak: 5,
        lastSeen: new Date(),
        save: mockSave
      };
      mockUserLeitnerStateFindOne.mockResolvedValue(mockState);

      await LeitnerService.updateLeitnerState('t1', 'user-1', VALID_QUESTION_ID, false);

      expect(mockState.level).toBe(1);
      expect(mockState.streak).toBe(0);
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
