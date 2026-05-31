// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuizTimeout } from './useQuizTimeout';

// ── Mocks ──────────────────────────────────────────────

const mockRouterPush = vi.fn();
const mockToastError = vi.fn();
const mockToastWarning = vi.fn();
const mockFinishQuizAction = vi.fn();
const mockT = vi.fn((key: string) => key); // returns key as label for easy assertion

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => mockT,
}));

vi.mock('@/actions/quiz', () => ({
  finishQuizAction: (...args: unknown[]) => mockFinishQuizAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args), warning: (...args: unknown[]) => mockToastWarning(...args) },
}));

// ── Tests ──────────────────────────────────────────────

describe('useQuizTimeout', () => {
  const handleNext = vi.fn(async (_isTimeout: boolean) => {});

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: finishQuizAction returns a resolved promise
    mockFinishQuizAction.mockResolvedValue({ success: true });
  });

  // ── handleGlobalTimeout ────

  it('should call toast.error with globalTimeout key on global timeout', () => {
    const { result } = renderHook(() =>
      useQuizTimeout('attempt-1', 'token-1', false, handleNext),
    );

    result.current.handleGlobalTimeout();

    expect(mockToastError).toHaveBeenCalledWith('globalTimeout');
  });

  it('should call finishQuizAction with correct params on global timeout', () => {
    const { result } = renderHook(() =>
      useQuizTimeout('attempt-1', 'token-1', false, handleNext),
    );

    result.current.handleGlobalTimeout();

    expect(mockFinishQuizAction).toHaveBeenCalledWith('attempt-1', 'token-1');
  });

  it('should navigate to results page when finishQuizAction succeeds', async () => {
    const { result } = renderHook(() =>
      useQuizTimeout('attempt-1', 'token-1', false, handleNext),
    );

    result.current.handleGlobalTimeout();

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/quiz/attempt-1/results');
    });
  });

  // ── handleQuestionTimeout ────

  it('should call toast.warning with questionTimeout key on question timeout', () => {
    const { result } = renderHook(() =>
      useQuizTimeout('attempt-1', 'token-1', false, handleNext),
    );

    result.current.handleQuestionTimeout();

    expect(mockToastWarning).toHaveBeenCalledWith('questionTimeout');
  });

  it('should call handleNext(true) when showFeedback is false', () => {
    const { result } = renderHook(() =>
      useQuizTimeout('attempt-1', 'token-1', false, handleNext),
    );

    result.current.handleQuestionTimeout();

    expect(handleNext).toHaveBeenCalledWith(true);
  });

  it('should NOT call handleNext when showFeedback is true (already reviewing)', () => {
    const { result } = renderHook(() =>
      useQuizTimeout('attempt-1', 'token-1', true, handleNext),
    );

    result.current.handleQuestionTimeout();

    expect(handleNext).not.toHaveBeenCalled();
    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it('should suppress errors from handleNext', () => {
    const rejectingNext = vi.fn(async () => { throw new Error('Network error'); });
    const { result } = renderHook(() =>
      useQuizTimeout('attempt-1', 'token-1', false, rejectingNext),
    );

    expect(() => { result.current.handleQuestionTimeout(); }).not.toThrow();
  });
});
