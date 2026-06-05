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

describe('useQuizNavigation — Part 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitAnswerAction.mockResolvedValue({ success: true });
  });

  // ── handleNext ────────────────────────────────────────

  describe('handleNext', () => {
    it('should call submitAnswerAction with correct params', async () => {
      const { result } = setupHook({ currentIndex: 0, selectedOption: 1 });

      await result.current.handleNext();

      expect(mockSubmitAnswerAction).toHaveBeenCalledWith({
        attemptId: 'attempt-123',
        questionIndex: 0,
        selectedOptionIndex: 1,
        timeSpent: 60,
        status: 'correcta',
        attemptToken: undefined,
        textAnswer: undefined,
      });
    });

    it('should call setIsSubmitting before and after', async () => {
      const { result, setIsSubmitting } = setupHook({ currentIndex: 0 });

      await result.current.handleNext();

      expect(setIsSubmitting).toHaveBeenCalledWith(true);
      expect(setIsSubmitting).toHaveBeenCalledWith(false);
    });

    it('should call setAnswers and advanceToNext (via updater) on success', async () => {
      const { result, setAnswers } = setupHook({ currentIndex: 0, selectedOption: 1 });

      await result.current.handleNext();

      expect(setAnswers).toHaveBeenCalledWith(expect.any(Function));
      const updater = setAnswers.mock.calls[0][0];
      const previous = [null, null, null];
      const updated = updater(previous);
      expect(updated).toEqual([1, null, null]);
    });

    it('should show error toast on failure', async () => {
      mockSubmitAnswerAction.mockRejectedValue(new Error('DB error'));

      const { result, setIsSubmitting } = setupHook({ currentIndex: 0 });

      await result.current.handleNext();

      expect(mockToastError).toHaveBeenCalledWith('errorProcess');
      expect(setIsSubmitting).toHaveBeenCalledWith(false);
    });
  });

  it('should show omitted confirm when on final question with omitted MC answers', async () => {
    const attemptWithOmitted = createFixture({
      examConfigId: {
        ...initialAttempt.examConfigId!,
        reviewOmittedQuestions: true,
      },
    });

    const answersState = { current: [null, null, 1] };
    const setCurrentIndex = vi.fn();
    const setAnswers = vi.fn((updater: (prev: (number | null)[]) => (number | null)[]) => {
      answersState.current = updater(answersState.current);
    });
    const setTextAnswers = vi.fn();
    const setSelectedOption = vi.fn();
    const setIsSubmitting = vi.fn();
    const setShowFeedback = vi.fn();
    const setShowFinishConfirm = vi.fn();
    const setShowOmittedConfirm = vi.fn();
    const resetTimerRef = { current: vi.fn() };

    const { result } = renderHook(() =>
      useQuizNavigation({
        initialAttempt: attemptWithOmitted,
        currentIndex: 2,
        answers: answersState.current,
        textAnswers: {},
        selectedOption: 1,
        isSubmitting: false,
        setCurrentIndex,
        setAnswers,
        setTextAnswers,
        setSelectedOption,
        setIsSubmitting,
        setShowFeedback,
        setShowFinishConfirm,
        setShowOmittedConfirm,
        resetTimerRef,
      }),
    );

    await result.current.handleNext();

    expect(setShowOmittedConfirm).toHaveBeenCalledWith(true);
    expect(setShowFinishConfirm).not.toHaveBeenCalled();
  });

  it('should show finish confirm when on last question with no omitted answers', async () => {
    const answersState = { current: [1, null, 1] };
    const setCurrentIndex = vi.fn();
    const setAnswers = vi.fn((updater: (prev: (number | null)[]) => (number | null)[]) => {
      answersState.current = updater(answersState.current);
    });
    const setTextAnswers = vi.fn();
    const setSelectedOption = vi.fn();
    const setIsSubmitting = vi.fn();
    const setShowFeedback = vi.fn();
    const setShowFinishConfirm = vi.fn();
    const setShowOmittedConfirm = vi.fn();
    const resetTimerRef = { current: vi.fn() };

    const { result } = renderHook(() =>
      useQuizNavigation({
        initialAttempt: createFixture({
          examConfigId: {
            ...initialAttempt.examConfigId!,
            reviewOmittedQuestions: true,
          },
        }),
        currentIndex: 2,
        answers: answersState.current,
        textAnswers: { 1: 'some answer' },
        selectedOption: 1,
        isSubmitting: false,
        setCurrentIndex,
        setAnswers,
        setTextAnswers,
        setSelectedOption,
        setIsSubmitting,
        setShowFeedback,
        setShowFinishConfirm,
        setShowOmittedConfirm,
        resetTimerRef,
      }),
    );

    await result.current.handleNext();

    expect(setShowFinishConfirm).toHaveBeenCalledWith(true);
    expect(setShowOmittedConfirm).not.toHaveBeenCalled();
  });

  // ── handleOptionSelect ───────────────────────────────

  describe('handleOptionSelect', () => {
    it('should call setSelectedOption with the selected index', async () => {
      const { result, setSelectedOption } = setupHook({ currentIndex: 0 });

      await result.current.handleOptionSelect(1);

      expect(setSelectedOption).toHaveBeenCalledWith(1);
    });

    it('should not do anything for open_text questions', async () => {
      const { result, setSelectedOption } = setupHook({ currentIndex: 1 });

      await result.current.handleOptionSelect(0);

      expect(setSelectedOption).not.toHaveBeenCalled();
      expect(mockSubmitAnswerAction).not.toHaveBeenCalled();
    });

    it('should auto-advance when examConfig.autoAdvanceOnSelect is true', async () => {
      const attemptWithAutoAdvance = createFixture({
        examConfigId: {
          ...initialAttempt.examConfigId!,
          autoAdvanceOnSelect: true,
        },
      });

      const setCurrentIndex = vi.fn();
      const setAnswers = vi.fn();
      const setTextAnswers = vi.fn();
      const setSelectedOption = vi.fn();
      const setIsSubmitting = vi.fn();
      const setShowFeedback = vi.fn();
      const setShowFinishConfirm = vi.fn();
      const setShowOmittedConfirm = vi.fn();
      const resetTimerRef = { current: vi.fn() };

      const { result } = renderHook(() =>
        useQuizNavigation({
          initialAttempt: attemptWithAutoAdvance,
          currentIndex: 0,
          answers: [null, null, null],
          textAnswers: {},
          selectedOption: null,
          isSubmitting: false,
          setCurrentIndex,
          setAnswers,
          setTextAnswers,
          setSelectedOption,
          setIsSubmitting,
          setShowFeedback,
          setShowFinishConfirm,
          setShowOmittedConfirm,
          resetTimerRef,
        }),
      );

      await result.current.handleOptionSelect(1);

      expect(setSelectedOption).toHaveBeenCalledWith(1);
      expect(mockSubmitAnswerAction).toHaveBeenCalled();
      expect(setIsSubmitting).toHaveBeenCalledWith(true);
    });
  });

  // ── startOmittedReview ───────────────────────────────

  describe('startOmittedReview', () => {
    it('should close omitted confirm and navigate to first omitted question', () => {
      const setCurrentIndex = vi.fn();
      const setAnswers = vi.fn();
      const setTextAnswers = vi.fn();
      const setSelectedOption = vi.fn();
      const setIsSubmitting = vi.fn();
      const setShowFeedback = vi.fn();
      const setShowFinishConfirm = vi.fn();
      const setShowOmittedConfirm = vi.fn();
      const resetTimerRef = { current: vi.fn() };

      const { result } = renderHook(() =>
        useQuizNavigation({
          initialAttempt,
          currentIndex: 2,
          answers: [null, 1, 1],
          textAnswers: { 1: 'text' },
          selectedOption: 1,
          isSubmitting: false,
          setCurrentIndex,
          setAnswers,
          setTextAnswers,
          setSelectedOption,
          setIsSubmitting,
          setShowFeedback,
          setShowFinishConfirm,
          setShowOmittedConfirm,
          resetTimerRef,
        }),
      );

      act(() => {
        result.current.startOmittedReview();
      });

      expect(setShowOmittedConfirm).toHaveBeenCalledWith(false);
      expect(setCurrentIndex).toHaveBeenCalledWith(0);
      expect(setSelectedOption).toHaveBeenCalledWith(null);
      expect(setShowFeedback).toHaveBeenCalledWith(false);
      expect(resetTimerRef.current).toHaveBeenCalled();
    });
  });

  // ── Error toast translations ──────────────────────────

  it('should use translated error message on handleNext failure', async () => {
    mockSubmitAnswerAction.mockRejectedValue(new Error('Server error'));

    const { result } = setupHook({ currentIndex: 0 });

    await result.current.handleNext();

    expect(mockToastError).toHaveBeenCalledWith('errorProcess');
    expect(mockT).toHaveBeenCalledWith('errorProcess');
  });
});
