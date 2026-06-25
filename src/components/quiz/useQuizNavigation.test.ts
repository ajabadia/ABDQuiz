// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizNavigation } from './useQuizNavigation';
import type { SerializedExamAttempt, SerializedExamConfig } from '@/types/quiz';

// ── Mocks ──────────────────────────────────────────────

const mockSubmitAnswerAction = vi.fn();
const mockToastError = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock('@/actions/quiz', () => ({
  submitAnswerAction: (...args: unknown[]) => mockSubmitAnswerAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => mockT,
}));

// ── Fixtures ───────────────────────────────────────────

function createFixture(overrides: Partial<SerializedExamAttempt> = {}): SerializedExamAttempt {
  return {
    _id: 'attempt-123',
    userId: 'user-1',
    tenantId: 'tenant-1',
    examConfigId: {
      _id: 'config-1',
      name: 'Test Exam',
      description: 'A test exam',
      questionCount: 3,
      questionTimeLimitSeconds: 60,
      globalTimeLimitSeconds: 1800,
      passThreshold: 70,
      shuffleQuestions: false,
      reviewOmittedQuestions: true,
      autoAdvanceOnSelect: false,
      moduleFilter: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    } as unknown as SerializedExamConfig,
    startedAt: new Date(),
    mode: 'training',
    status: 'in_progress',
    percentage: 0,
    score: 0,
    questionTimeLimitSeconds: 60,
    timeLimitSeconds: 600,
    gradingStatus: 'auto_graded',
    questions: [
      {
        questionId: 'q-1',
        questionSnapshot: {
          questionText: 'What is 2+2?',
          options: ['3', '4', '5'],
          module: 'math',
          source: 'test',
          explanation: '2+2=4',
          correctOptionIndex: 1,
          type: 'multiple_choice',
        },
        selectedOptionIndex: undefined,
        manualTextAnswer: undefined,
        isCorrect: false,
        timeSpentSeconds: 0,
        status: 'no_respondida',
      },
      {
        questionId: 'q-2',
        questionSnapshot: {
          questionText: 'Explain gravity',
          options: [],
          module: 'physics',
          source: 'test',
          explanation: 'Gravity is...',
          correctOptionIndex: 0,
          type: 'open_text',
        },
        selectedOptionIndex: undefined,
        manualTextAnswer: undefined,
        isCorrect: false,
        timeSpentSeconds: 0,
        status: 'no_respondida',
      },
      {
        questionId: 'q-3',
        questionSnapshot: {
          questionText: 'What is the capital of France?',
          options: ['London', 'Paris', 'Berlin'],
          module: 'geography',
          source: 'test',
          explanation: 'Paris is the capital',
          correctOptionIndex: 1,
          type: 'multiple_choice',
        },
        selectedOptionIndex: undefined,
        manualTextAnswer: undefined,
        isCorrect: false,
        timeSpentSeconds: 0,
        status: 'no_respondida',
      },
    ],
    ...overrides,
  } as unknown as SerializedExamAttempt;
}

const initialAttempt = createFixture();

// ── Test helpers ───────────────────────────────────────

interface HookParams {
  currentIndex?: number;
  answers?: (number | null)[];
  textAnswers?: Record<number, string>;
  selectedOption?: number | null;
  isSubmitting?: boolean;
}

function setupHook(overrides: HookParams = {}) {
  // Track state in mutable variables so updater functions actually execute
  const answersState = { current: overrides.answers ?? [null, null, null] };
  const textAnswersState = { current: overrides.textAnswers ?? {} };

  const setCurrentIndex = vi.fn();
  const setAnswers = vi.fn((updater: (prev: (number | null)[]) => (number | null)[]) => {
    answersState.current = updater(answersState.current);
  });
  const setTextAnswers = vi.fn((updater: (prev: Record<number, string>) => Record<number, string>) => {
    textAnswersState.current = updater(textAnswersState.current);
  });
  const setSelectedOption = vi.fn();
  const setIsSubmitting = vi.fn();
  const setShowFeedback = vi.fn();
  const setShowFinishConfirm = vi.fn();
  const setShowOmittedConfirm = vi.fn();
  const resetTimerRef = { current: vi.fn() };

  const params = {
    initialAttempt,
    currentIndex: overrides.currentIndex ?? 0,
    answers: answersState.current,
    textAnswers: textAnswersState.current,
    attachmentUrls: {},
    selectedOption: overrides.selectedOption ?? null,
    isSubmitting: overrides.isSubmitting ?? false,
    setCurrentIndex,
    setAnswers,
    setTextAnswers,
    setSelectedOption,
    setIsSubmitting,
    setShowFeedback,
    setShowFinishConfirm,
    setShowOmittedConfirm,
    resetTimerRef,
  };

  const { result, rerender } = renderHook(() => useQuizNavigation(params));

  return {
    result,
    rerender: () => rerender(),
    // Expose setters for assertions
    setCurrentIndex,
    setAnswers,
    setTextAnswers,
    setSelectedOption,
    setIsSubmitting,
    setShowFeedback,
    setShowFinishConfirm,
    setShowOmittedConfirm,
    resetTimerRef,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('useQuizNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitAnswerAction.mockResolvedValue({ success: true });
  });

  // ── Initial state ──────────────────────────────────────

  it('should return derived state based on currentIndex', () => {
    const { result } = setupHook({ currentIndex: 0 });

    expect(result.current.currentQuestion?.questionId).toBe('q-1');
    expect(result.current.isOpenText).toBe(false);
    expect(result.current.textAnswer).toBe('');
  });

  it('should detect open_text questions', () => {
    const { result } = setupHook({ currentIndex: 1, textAnswers: { 1: 'hello' } });

    expect(result.current.currentQuestion?.questionId).toBe('q-2');
    expect(result.current.isOpenText).toBe(true);
    expect(result.current.textAnswer).toBe('hello');
  });

  // ── getQuestionStatus ──────────────────────────────────

  describe('getQuestionStatus', () => {
    it('should return "no_respondida_por_tiempo" when isTimeout is true', () => {
      const { result } = setupHook({ currentIndex: 0 });
      expect(result.current.getQuestionStatus(1, '', true)).toBe('no_respondida_por_tiempo');
    });

    it('should return "correcta" for open_text with non-empty text', () => {
      const { result } = setupHook({ currentIndex: 1 });
      expect(result.current.getQuestionStatus(null, 'some answer', false)).toBe('correcta');
    });

    it('should return "no_respondida" for open_text with empty text', () => {
      const { result } = setupHook({ currentIndex: 1 });
      expect(result.current.getQuestionStatus(null, '', false)).toBe('no_respondida');
    });

    it('should return "no_respondida" when selectedOption is null for MC', () => {
      const { result } = setupHook({ currentIndex: 0 });
      expect(result.current.getQuestionStatus(null, '', false)).toBe('no_respondida');
    });

    it('should return "correcta" when selectedOption matches correctOptionIndex', () => {
      const { result } = setupHook({ currentIndex: 0 });
      // Q0 correctOptionIndex is 1
      expect(result.current.getQuestionStatus(1, '', false)).toBe('correcta');
    });

    it('should return "incorrecta" when selectedOption does not match correctOptionIndex', () => {
      const { result } = setupHook({ currentIndex: 0 });
      expect(result.current.getQuestionStatus(0, '', false)).toBe('incorrecta');
    });
  });

  // ── jumpToQuestion ────────────────────────────────────

  describe('jumpToQuestion', () => {
    it('should return early when targetIndex equals currentIndex', async () => {
      const { result } = setupHook({ currentIndex: 0 });

      await result.current.jumpToQuestion(0);

      expect(mockSubmitAnswerAction).not.toHaveBeenCalled();
    });

    it('should return early when isSubmitting is true', async () => {
      const { result } = setupHook({ currentIndex: 0, isSubmitting: true });

      await result.current.jumpToQuestion(1);

      expect(mockSubmitAnswerAction).not.toHaveBeenCalled();
    });

    it('should call submitAnswerAction with correct params', async () => {
      const { result, setIsSubmitting } = setupHook({ currentIndex: 0 });

      await result.current.jumpToQuestion(1);

      expect(mockSubmitAnswerAction).toHaveBeenCalledWith({
        attemptId: 'attempt-123',
        questionIndex: 0,
        selectedOptionIndex: null,
        timeSpent: 60,
        status: 'no_respondida',
        attemptToken: undefined,
        textAnswer: undefined,
      });
      // isSubmitting is set before and after
      expect(setIsSubmitting).toHaveBeenCalledWith(true);
      expect(setIsSubmitting).toHaveBeenCalledWith(false);
    });

    it('should navigate to target question on success', async () => {
      const { result, setCurrentIndex, setSelectedOption, setShowFeedback, resetTimerRef } = setupHook({ currentIndex: 0 });

      await result.current.jumpToQuestion(2);

      expect(setCurrentIndex).toHaveBeenCalledWith(2);
      // Q2 is MC, selectedOption from answers[2] which is null
      expect(setSelectedOption).toHaveBeenCalledWith(null);
      expect(setShowFeedback).toHaveBeenCalledWith(false);
      expect(resetTimerRef.current).toHaveBeenCalled();
    });

    it('should preserve selectedOption when target is open_text (sets null)', async () => {
      const { result, setSelectedOption } = setupHook({ currentIndex: 0 });

      await result.current.jumpToQuestion(1);

      expect(setSelectedOption).toHaveBeenCalledWith(null);
    });

    it('should handle open_text answer submission correctly', async () => {
      const { result } = setupHook({ currentIndex: 1, selectedOption: null, textAnswers: { 1: 'my text answer' } });

      await result.current.jumpToQuestion(2);

      expect(mockSubmitAnswerAction).toHaveBeenCalledWith(
        expect.objectContaining({
          questionIndex: 1,
          selectedOptionIndex: null,
          textAnswer: 'my text answer',
          status: 'correcta', // open text with non-empty text
        }),
      );
    });

    it('should show error toast when submitAnswerAction fails', async () => {
      mockSubmitAnswerAction.mockRejectedValue(new Error('Network error'));

      const { result, setIsSubmitting } = setupHook({ currentIndex: 0 });

      await result.current.jumpToQuestion(1);

      expect(mockToastError).toHaveBeenCalledWith('Error al guardar la respuesta anterior');
      expect(setIsSubmitting).toHaveBeenCalledWith(false);
    });
  });

});
