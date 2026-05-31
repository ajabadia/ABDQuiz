// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuizHeartbeat } from './useQuizHeartbeat';

// ── Mocks ──────────────────────────────────────────────

const mockHeartbeatAction = vi.fn();

vi.mock('@/actions/quiz', () => ({
  heartbeatAction: (...args: unknown[]) => mockHeartbeatAction(...args),
}));

// ── Tests ──────────────────────────────────────────────

describe('useQuizHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockHeartbeatAction.mockReset();
    mockHeartbeatAction.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call heartbeatAction immediately on mount', () => {
    renderHook(() => useQuizHeartbeat('attempt-1'));

    expect(mockHeartbeatAction).toHaveBeenCalledTimes(1);
    expect(mockHeartbeatAction).toHaveBeenCalledWith('attempt-1');
  });

  it('should call heartbeatAction with the given attemptId', () => {
    renderHook(() => useQuizHeartbeat('custom-attempt-id'));

    expect(mockHeartbeatAction).toHaveBeenCalledWith('custom-attempt-id');
  });

  it('should call heartbeatAction again after 30 seconds', () => {
    renderHook(() => useQuizHeartbeat('attempt-1'));

    // Initial call on mount
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(1);

    // Advance past the 30s interval
    vi.advanceTimersByTime(30_000);

    expect(mockHeartbeatAction).toHaveBeenCalledTimes(2);
    expect(mockHeartbeatAction).toHaveBeenCalledWith('attempt-1');
  });

  it('should continue sending heartbeats on each interval tick', () => {
    renderHook(() => useQuizHeartbeat('attempt-1'));

    vi.advanceTimersByTime(30_000); // tick 1
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(30_000); // tick 2
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(30_000); // tick 3
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(4);
  });

  it('should clear interval when server returns attemptEnded: true', async () => {
    mockHeartbeatAction.mockResolvedValue({ attemptEnded: true });

    renderHook(() => useQuizHeartbeat('attempt-1'));

    // Advance timers asynchronously so the Promise.then() microtask
    // that checks attemptEnded runs and clears the interval
    await vi.advanceTimersByTimeAsync(30_000);

    // Advance more time synchronously — interval should already be cleared
    vi.advanceTimersByTime(90_000);

    // Only 2 calls: initial mount + the one that detected attemptEnded
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(2);
  });

  it('should NOT clear interval when server returns normal response', async () => {
    mockHeartbeatAction
      .mockResolvedValueOnce({})          // initial call
      .mockResolvedValueOnce({})          // tick 1
      .mockResolvedValueOnce({})          // tick 2
      .mockResolvedValue({ attemptEnded: true }); // tick 3 → stops

    renderHook(() => useQuizHeartbeat('attempt-1'));

    await vi.advanceTimersByTimeAsync(30_000); // tick 1 → normal → continues
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(30_000); // tick 2 → normal → continues
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(30_000); // tick 3 → attemptEnded → stops
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(4);

    await vi.advanceTimersByTimeAsync(90_000); // no more calls (interval cleared on tick 3)
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(4);
  });

  it('should clean up interval on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');

    const { unmount } = renderHook(() => useQuizHeartbeat('attempt-1'));

    // Advance some time to ensure interval is running
    vi.advanceTimersByTime(30_000);
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(2);

    unmount();

    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });

  it('should suppress errors from heartbeatAction silently', () => {
    mockHeartbeatAction.mockRejectedValue(new Error('Network error'));

    // Should not throw during mount or interval ticks
    const { unmount } = renderHook(() => useQuizHeartbeat('attempt-1'));

    vi.advanceTimersByTime(30_000); // tick with rejection
    vi.advanceTimersByTime(30_000); // another tick

    // Despite errors, the interval should continue (no attemptEnded in response)
    expect(mockHeartbeatAction).toHaveBeenCalledTimes(3);

    unmount();
  });
});
