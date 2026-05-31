import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockFindById,
  mockFind,
  mockCreate,
  mockFindOne,
  mockAttemptFind,
  mockAssignFindOne,
  setupDefaultMocks,
} from './quizService.test.mocks';

// ── Inline vi.mock calls (hoisted by vitest) ───────────
vi.mock('@ajabadia/satellite-sdk', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/ExamConfig', () => {
  class MockExamConfig {
    static findById = mockFindById;
  }
  return { default: MockExamConfig, mockFindById };
});

vi.mock('@/models/Question', () => {
  class MockQuestion {
    static find = mockFind;
  }
  return { default: MockQuestion, mockFind };
});

vi.mock('@/models/ExamAttempt', () => {
  class MockExamAttempt {
    static countDocuments = vi.fn();
    static create = mockCreate;
    static findOne = mockFindOne;
    static find = mockAttemptFind;
  }
  return {
    default: MockExamAttempt,
    mockCountDocuments: vi.fn(),
    mockCreate,
    mockFindOne,
    mockAttemptFind,
  };
});

vi.mock('@/models/ExamAssignment', () => {
  class MockExamAssignment {
    static findOne = mockAssignFindOne;
  }
  return { default: MockExamAssignment, mockFindOne: mockAssignFindOne };
});

// Must import after vi.mock hoisting
import { QuizService } from './quizService';

describe('QuizService — Advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('should implement stratified difficulty selection if distribution is provided', async () => {
    mockFindById.mockResolvedValue({
      _id: 'config-1',
      active: true,
      maxAttempts: 0,
      moduleFilter: [],
      questionCount: 3,
      difficultyDistribution: { easy: 1, medium: 1, hard: 1 },
      excludePreviouslyCorrect: false,
    });

    const mockQuestions = [
      { _id: 'qe', questionText: 'Fácil', options: ['A'], difficulty: 'easy', correctOptionIndex: 0 },
      { _id: 'qm', questionText: 'Media', options: ['B'], difficulty: 'medium', correctOptionIndex: 0 },
      { _id: 'qh1', questionText: 'Difícil 1', options: ['C'], difficulty: 'hard', correctOptionIndex: 0 },
      { _id: 'qh2', questionText: 'Difícil 2', options: ['D'], difficulty: 'hard', correctOptionIndex: 0 },
    ];

    mockFind.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as any);
    mockCreate.mockImplementation(async (data: any) => ({
      _id: 'attempt-stratified',
      questions: data.questions,
    }));

    const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-1');

    expect(attempt.questions).toHaveLength(3);
    const diffs = attempt.questions.map((q: any) => q.questionSnapshot.difficulty);
    expect(diffs).toContain('easy');
    expect(diffs).toContain('medium');
    expect(diffs).toContain('hard');
  });

  it('should shuffle options and correctly remap correctOptionIndex when shuffleOptions is enabled', async () => {
    mockFindById.mockResolvedValue({
      _id: 'config-shuffle',
      active: true,
      maxAttempts: 0,
      moduleFilter: [],
      questionCount: 1,
      shuffleOptions: true,
      excludePreviouslyCorrect: false,
    });

    const mockQuestions = [
      { _id: 'q-shuffle', questionText: 'Shuffle P', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2 },
    ];

    mockFind.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as any);

    const mockSave = vi.fn().mockResolvedValue(true);
    mockCreate.mockImplementation(async (data: any) => ({
      _id: 'attempt-shuffle',
      questions: data.questions,
      save: mockSave,
    }));

    const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-shuffle');

    const q = attempt.questions[0];
    const correctText = q.questionSnapshot.options[q.questionSnapshot.correctOptionIndex];
    expect(correctText).toBe('C');
    expect(mockSave).toHaveBeenCalled();
  });

  it('should exclude previously correct questions when excludePreviouslyCorrect is enabled', async () => {
    mockFindById.mockResolvedValue({
      _id: 'config-1',
      active: true,
      maxAttempts: 0,
      moduleFilter: [],
      questionCount: 3,
      excludePreviouslyCorrect: true,
    });

    const mockQuestions = [
      { _id: 'q1', questionText: 'Q1 Already Correct', options: ['A', 'B'], difficulty: 'easy', correctOptionIndex: 0 },
      { _id: 'q2', questionText: 'Q2 Incorrect', options: ['C', 'D'], difficulty: 'medium', correctOptionIndex: 0 },
      { _id: 'q3', questionText: 'Q3 No respondida', options: ['E', 'F'], difficulty: 'hard', correctOptionIndex: 0 },
      { _id: 'q4', questionText: 'Q4 Already Correct', options: ['G', 'H'], difficulty: 'easy', correctOptionIndex: 0 },
      { _id: 'q5', questionText: 'Q5 Incorrect', options: ['I', 'J'], difficulty: 'medium', correctOptionIndex: 0 },
    ];

    mockFind.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as any);

    mockAttemptFind.mockResolvedValue([
      {
        _id: 'prev-attempt-1',
        userId: 'u1',
        examConfigId: 'config-1',
        status: 'completed',
        questions: [
          { questionId: 'q1', status: 'correcta' },
          { questionId: 'q2', status: 'incorrecta' },
          { questionId: 'q3', status: 'no_respondida' },
        ],
      },
      {
        _id: 'prev-attempt-2',
        userId: 'u1',
        examConfigId: 'config-1',
        status: 'completed',
        questions: [
          { questionId: 'q4', status: 'correcta' },
          { questionId: 'q5', status: 'incorrecta' },
        ],
      },
    ]);

    mockCreate.mockImplementation(async (data: any) => ({
      _id: 'attempt-exclude',
      questions: data.questions,
      save: vi.fn().mockResolvedValue(true),
    }));

    const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-1');

    const questionIds = attempt.questions.map((q: any) => q.questionId);
    expect(questionIds).not.toContain('q1');
    expect(questionIds).not.toContain('q4');
    expect(questionIds).toContain('q2');
    expect(questionIds).toContain('q3');
    expect(questionIds).toContain('q5');
    expect(attempt.questions).toHaveLength(3);
  });

  it('should throw when excludePreviouslyCorrect leaves no remaining questions', async () => {
    mockFindById.mockResolvedValue({
      _id: 'config-1',
      active: true,
      maxAttempts: 0,
      moduleFilter: [],
      questionCount: 3,
      excludePreviouslyCorrect: true,
    });

    const mockQuestions = [
      { _id: 'q1', questionText: 'Q1', options: ['A', 'B'], difficulty: 'easy', correctOptionIndex: 0 },
      { _id: 'q2', questionText: 'Q2', options: ['C', 'D'], difficulty: 'medium', correctOptionIndex: 0 },
    ];

    mockFind.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as any);

    mockAttemptFind.mockResolvedValue([
      {
        _id: 'prev-attempt',
        userId: 'u1',
        examConfigId: 'config-1',
        status: 'completed',
        questions: [
          { questionId: 'q1', status: 'correcta' },
          { questionId: 'q2', status: 'correcta' },
        ],
      },
    ]);

    await expect(
      QuizService.createExamAttempt('u1', 't1', 'config-1')
    ).rejects.toThrow('Ya has acertado todas las preguntas disponibles');
  });

  it('should perform adaptive weighted selection when adaptiveQuestionSelection is enabled', async () => {
    mockFindById.mockResolvedValue({
      _id: 'config-adaptive',
      active: true,
      maxAttempts: 0,
      moduleFilter: [],
      questionCount: 3,
      adaptiveQuestionSelection: true,
    });

    const mockQuestions = [
      { _id: 'q_weak_mod', questionText: 'Weak Module Q1', options: ['A', 'B'], difficulty: 'easy', module: 'Módulo Débil', correctOptionIndex: 0 },
      { _id: 'q_weak_mod2', questionText: 'Weak Module Q2', options: ['C', 'D'], difficulty: 'hard', module: 'Módulo Débil', correctOptionIndex: 0 },
      { _id: 'q_weak_mod3', questionText: 'Weak Module Q3', options: ['E', 'F'], difficulty: 'medium', module: 'Módulo Débil', correctOptionIndex: 0 },
      { _id: 'q_strong_mod', questionText: 'Strong Module Q1', options: ['G', 'H'], difficulty: 'easy', module: 'Módulo Fuerte', correctOptionIndex: 0 },
      { _id: 'q_strong_mod2', questionText: 'Strong Module Q2', options: ['I', 'J'], difficulty: 'hard', module: 'Módulo Fuerte', correctOptionIndex: 0 },
    ];

    mockFind.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as any);

    mockAttemptFind.mockResolvedValue([
      {
        _id: 'prev-attempt',
        userId: 'u1',
        examConfigId: 'config-adaptive',
        status: 'completed',
        questions: [
          { questionId: 'q_weak_mod', status: 'incorrecta', questionSnapshot: { module: 'Módulo Débil', difficulty: 'easy' } },
          { questionId: 'q_strong_mod', status: 'correcta', questionSnapshot: { module: 'Módulo Fuerte', difficulty: 'easy' } },
          { questionId: 'q_strong_mod2', status: 'correcta', questionSnapshot: { module: 'Módulo Fuerte', difficulty: 'hard' } },
        ],
      },
    ]);

    mockCreate.mockImplementation(async (data: any) => ({
      _id: 'attempt-adaptive',
      questions: data.questions,
      save: vi.fn().mockResolvedValue(true),
    }));

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-adaptive');
    randomSpy.mockRestore();

    expect(attempt.questions).toHaveLength(3);
    const questionIds = attempt.questions.map((q: any) => q.questionId);
    const weakCount = questionIds.filter(
      (id: string) => id === 'q_weak_mod' || id === 'q_weak_mod2' || id === 'q_weak_mod3'
    ).length;
    expect(weakCount).toBeGreaterThanOrEqual(2);
  });

  it('should fall back to random selection when adaptive is enabled but no history exists', async () => {
    mockFindById.mockResolvedValue({
      _id: 'config-adaptive-no-history',
      active: true,
      maxAttempts: 0,
      moduleFilter: [],
      questionCount: 2,
      adaptiveQuestionSelection: true,
    });

    const mockQuestions = [
      { _id: 'q1', questionText: 'Q1', options: ['A', 'B'], difficulty: 'easy', module: 'Mod1', correctOptionIndex: 0 },
      { _id: 'q2', questionText: 'Q2', options: ['C', 'D'], difficulty: 'medium', module: 'Mod1', correctOptionIndex: 0 },
      { _id: 'q3', questionText: 'Q3', options: ['E', 'F'], difficulty: 'hard', module: 'Mod2', correctOptionIndex: 0 },
    ];

    mockFind.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockQuestions) } as any);
    mockAttemptFind.mockResolvedValue([]);

    mockCreate.mockImplementation(async (data: any) => ({
      _id: 'attempt-adaptive-no-history',
      questions: data.questions,
      save: vi.fn().mockResolvedValue(true),
    }));

    const attempt = await QuizService.createExamAttempt('u1', 't1', 'config-adaptive-no-history');

    expect(attempt.questions).toHaveLength(2);
    expect(attempt.questions.map((q: any) => q.questionId).length).toBe(2);
  });
});
