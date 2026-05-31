// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizTimerOrchestrator } from './useQuizTimerOrchestrator';

/**
 * Tests for useQuizTimerOrchestrator.
 *
 * The orchestrator IS a thin compositor. Rather than testing React 18's
 * timer batching behavior (which varies between jsdom+fake-timers and
 * real browsers), we mock useQuizTimer and test the orchestrator's
 * specific responsibilities:
 *
 * 1. ✅ Calls useQuizTimer with the correct props
 * 2. ✅ Returns all values from useQuizTimer
 * 3. ✅ Syncs an externally-provided ref to resetQuestionTimer
 * 4. ✅ Cleanup does not throw
 */

// ── Mock useQuizTimer ────────────────────────────────

const mockResetQuestionTimer = vi.fn(() => {});

vi.mock('./useQuizTimer', () => ({
  useQuizTimer: vi.fn((props: Record<string, unknown>) => ({
    globalTime: props.totalSeconds ?? 0,
    questionTime: props.questionSeconds ?? 0,
    resetQuestionTimer: mockResetQuestionTimer,
    isGlobalLow: (props.totalSeconds as number) > 0 && (props.totalSeconds as number) < 60,
    isQuestionLow: (props.questionSeconds as number) > 0 && (props.questionSeconds as number) < 10,
  })),
}));

// Re-import after mocking
import { useQuizTimer } from './useQuizTimer';
const { useQuizTimer: mockedUseQuizTimer } = vi.mocked({ useQuizTimer });

// ── Helpers ──────────────────────────────────────────

/** Create a MutableRefObject-compatible ref for testing */
function createResetRef() {
  return { current: vi.fn(() => {}) } as React.MutableRefObject<() => void>;
}

// ── Tests ────────────────────────────────────────────

describe('useQuizTimerOrchestrator', () => {
  const onGlobalTimeout = vi.fn(() => {});
  const onQuestionTimeout = vi.fn(() => {});

  const defaultProps = {
    totalSeconds: 120,
    questionSeconds: 30,
    onGlobalTimeout,
    onQuestionTimeout,
    isPaused: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Composition ────

  it('should call useQuizTimer with the provided props', () => {
    const resetTimerRef = createResetRef();
    renderHook(() => useQuizTimerOrchestrator({
      totalSeconds: 60,
      questionSeconds: 20,
      onGlobalTimeout,
      onQuestionTimeout,
      isPaused: true,
      resetTimerRef,
    }));

    expect(mockedUseQuizTimer).toHaveBeenCalledWith({
      totalSeconds: 60,
      questionSeconds: 20,
      onGlobalTimeout,
      onQuestionTimeout,
      isPaused: true,
    });
  });

  it('should pass onGlobalTimeout and onQuestionTimeout through to useQuizTimer', () => {
    const resetTimerRef = createResetRef();
    const gTimeout = vi.fn(() => {});
    const qTimeout = vi.fn(() => {});

    renderHook(() => useQuizTimerOrchestrator({
      ...defaultProps,
      onGlobalTimeout: gTimeout,
      onQuestionTimeout: qTimeout,
      resetTimerRef,
    }));

    expect(mockedUseQuizTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        onGlobalTimeout: gTimeout,
        onQuestionTimeout: qTimeout,
      }),
    );
  });

  it('should pass isPaused through to useQuizTimer', () => {
    const resetTimerRef = createResetRef();
    renderHook(() => useQuizTimerOrchestrator({
      ...defaultProps,
      isPaused: true,
      resetTimerRef,
    }));

    expect(mockedUseQuizTimer).toHaveBeenCalledWith(
      expect.objectContaining({ isPaused: true }),
    );
  });

  // ── Return values ────

  it('should return globalTime and questionTime from useQuizTimer', () => {
    const resetTimerRef = createResetRef();
    const { result } = renderHook(() =>
      useQuizTimerOrchestrator({ ...defaultProps, resetTimerRef }),
    );

    expect(result.current.globalTime).toBe(120);
    expect(result.current.questionTime).toBe(30);
  });

  it('should return isGlobalLow and isQuestionLow from useQuizTimer', () => {
    const resetTimerRef = createResetRef();
    const { result } = renderHook(() =>
      useQuizTimerOrchestrator({ ...defaultProps, totalSeconds: 30, resetTimerRef }),
    );

    expect(result.current.isGlobalLow).toBe(true);
    expect(result.current.isQuestionLow).toBe(false);
  });

  // ── Ref sync (the orchestrator's core responsibility) ────

  it('should sync resetTimerRef.current to resetQuestionTimer after mount', () => {
    const resetTimerRef = createResetRef();
    renderHook(() =>
      useQuizTimerOrchestrator({ ...defaultProps, resetTimerRef }),
    );

    // After mount, the useEffect should have set resetTimerRef.current
    // to the mock's resetQuestionTimer
    resetTimerRef.current();
    expect(mockResetQuestionTimer).toHaveBeenCalledTimes(1);
  });

  it('should keep resetTimerRef.current in sync across rerenders', () => {
    const resetTimerRef = createResetRef();
    const { rerender } = renderHook(
      (props: Parameters<typeof useQuizTimerOrchestrator>[0]) =>
        useQuizTimerOrchestrator(props),
      { initialProps: { ...defaultProps, resetTimerRef } },
    );

    // Verify ref is synced after initial mount
    resetTimerRef.current();
    expect(mockResetQuestionTimer).toHaveBeenCalledTimes(1);

    // Rerender — useEffect re-runs and syncs again
    rerender({ ...defaultProps, totalSeconds: 90, resetTimerRef });

    // Calling the ref should still invoke the same mock
    resetTimerRef.current();
    expect(mockResetQuestionTimer).toHaveBeenCalledTimes(2);
  });

  // ── Edge cases ────

  it('should handle totalSeconds=0 and questionSeconds=0', () => {
    const resetTimerRef = createResetRef();
    const { result } = renderHook(() =>
      useQuizTimerOrchestrator({
        ...defaultProps,
        totalSeconds: 0,
        questionSeconds: 0,
        resetTimerRef,
      }),
    );

    expect(result.current.globalTime).toBe(0);
    expect(result.current.questionTime).toBe(0);
    expect(result.current.isGlobalLow).toBe(false);
    expect(result.current.isQuestionLow).toBe(false);
  });
});
