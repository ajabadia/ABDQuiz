// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizFinish } from './useQuizFinish';

// ── Mocks ──────────────────────────────────────────────

const mockRouterPush = vi.fn();
const mockToastError = vi.fn();
const mockFinishQuizAction = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('@/actions/quiz', () => ({
  finishQuizAction: (...args: unknown[]) => mockFinishQuizAction(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

// ── Tests ──────────────────────────────────────────────

describe('useQuizFinish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ────

  it('should start with all dialogs closed and not submitting', () => {
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    expect(result.current.showFinishConfirm).toBe(false);
    expect(result.current.showOmittedConfirm).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should allow toggling showFinishConfirm via setter', () => {
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    act(() => { result.current.setShowFinishConfirm(true); });
    expect(result.current.showFinishConfirm).toBe(true);

    act(() => { result.current.setShowFinishConfirm(false); });
    expect(result.current.showFinishConfirm).toBe(false);
  });

  it('should allow toggling showOmittedConfirm via setter', () => {
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    act(() => { result.current.setShowOmittedConfirm(true); });
    expect(result.current.showOmittedConfirm).toBe(true);
  });

  it('should allow toggling isSubmitting via setter', () => {
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    act(() => { result.current.setIsSubmitting(true); });
    expect(result.current.isSubmitting).toBe(true);
  });

  // ── confirmFinish ────

  it('should set isSubmitting=true and close dialog immediately when confirmFinish called', async () => {
    mockFinishQuizAction.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    // Start with dialog open
    act(() => { result.current.setShowFinishConfirm(true); });

    let promise: Promise<unknown>;
    act(() => { promise = result.current.confirmFinish(); });

    // Immediate effects before await
    expect(result.current.isSubmitting).toBe(true);
    expect(result.current.showFinishConfirm).toBe(false);

    await act(() => promise!);
  });

  it('should call finishQuizAction with correct params', async () => {
    mockFinishQuizAction.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    await act(() => result.current.confirmFinish());

    expect(mockFinishQuizAction).toHaveBeenCalledWith('attempt-1', 'token-1');
  });

  it('should navigate to results page on success', async () => {
    mockFinishQuizAction.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    await act(() => result.current.confirmFinish());

    expect(mockRouterPush).toHaveBeenCalledWith('/quiz/attempt-1/results');
  });

  it('should NOT navigate when finishQuizAction returns success:false', async () => {
    mockFinishQuizAction.mockResolvedValue({ success: false });
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    await act(() => result.current.confirmFinish());

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should show toast error and reset isSubmitting on failure', async () => {
    mockFinishQuizAction.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useQuizFinish('attempt-1', 'token-1'));

    await act(() => result.current.confirmFinish());

    expect(mockToastError).toHaveBeenCalledWith('Fallo al finalizar el examen');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should work without attemptToken', async () => {
    mockFinishQuizAction.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useQuizFinish('attempt-1', undefined));

    await act(() => result.current.confirmFinish());

    expect(mockFinishQuizAction).toHaveBeenCalledWith('attempt-1', undefined);
    expect(mockRouterPush).toHaveBeenCalled();
  });
});
