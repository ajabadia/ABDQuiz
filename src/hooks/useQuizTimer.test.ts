// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizTimer } from './useQuizTimer';

// ── Helpers ───────────────────────────────────────────────

/**
 * Advances fake timers by the given milliseconds and flushes React updates.
 * Uses the async variant so React's scheduler microtasks are processed.
 * Used only for state-decrement tests where act() batching is fine.
 */
async function tick(ms = 1000) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

/**
 * Supresses React's "not wrapped in act(...)" warnings.
 * Needed when calling interval callbacks outside act().
 */
function suppressActWarnings() {
  vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
    if (typeof msg === 'string' && msg.includes('was not wrapped in act')) return;
    // eslint-disable-next-line no-console
    console.error(msg);
  });
}

// ── Tests ─────────────────────────────────────────────────

describe('useQuizTimer', () => {
  let onGlobalTimeout = vi.fn(() => {});
  let onQuestionTimeout = vi.fn(() => {});

  beforeEach(() => {
    onGlobalTimeout = vi.fn(() => {});
    onQuestionTimeout = vi.fn(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════
  //  Initial state (no timers needed)
  // ═══════════════════════════════════════════════════════

  describe('initial state', () => {
    it('should return globalTime = totalSeconds initially', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.globalTime).toBe(120);
    });

    it('should return questionTime = questionSeconds initially', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.questionTime).toBe(30);
    });

    it('should return resetQuestionTimer as a function', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(typeof result.current.resetQuestionTimer).toBe('function');
    });

    it('should return both low flags', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current).toHaveProperty('isGlobalLow');
      expect(result.current).toHaveProperty('isQuestionLow');
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Low flags (pure computations, no timers)
  // ═══════════════════════════════════════════════════════

  describe('isGlobalLow', () => {
    it('should be true when totalSeconds > 0 and globalTime < 60', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 30, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.isGlobalLow).toBe(true);
    });

    it('should be false when globalTime >= 60', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.isGlobalLow).toBe(false);
    });

    it('should be false when totalSeconds = 0', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 0, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.isGlobalLow).toBe(false);
    });
  });

  describe('isQuestionLow', () => {
    it('should be true when questionSeconds > 0 and questionTime < 10', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 5,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.isQuestionLow).toBe(true);
    });

    it('should be false when questionTime >= 10', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.isQuestionLow).toBe(false);
    });

    it('should be false when questionSeconds = 0', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 0,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );
      expect(result.current.isQuestionLow).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Interval lifecycle (spy on setInterval / clearInterval)
  // ═══════════════════════════════════════════════════════

  describe('interval lifecycle', () => {
    let setIntervalSpy: ReturnType<typeof vi.spyOn>;
    let clearIntervalSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      setIntervalSpy = vi.spyOn(global, 'setInterval');
      clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    });

    afterEach(() => {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('should start setInterval on mount with 1000ms delay', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should NOT start setInterval when isPaused = true', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
          isPaused: true,
        }),
      );

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('should clear interval on unmount', () => {
      const { unmount } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 120, questionSeconds: 30,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('should restart interval when isPaused changes from true → false', () => {
      const { rerender } = renderHook(
        (p: { paused: boolean }) =>
          useQuizTimer({
            totalSeconds: 120, questionSeconds: 30,
            onGlobalTimeout, onQuestionTimeout,
            isPaused: p.paused,
          }),
        { initialProps: { paused: true } },
      );

      expect(setIntervalSpy).not.toHaveBeenCalled();

      rerender({ paused: false });

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear previous interval when isPaused changes from false → true', () => {
      const { rerender } = renderHook(
        (p: { paused: boolean }) =>
          useQuizTimer({
            totalSeconds: 120, questionSeconds: 30,
            onGlobalTimeout, onQuestionTimeout,
            isPaused: p.paused,
          }),
        { initialProps: { paused: false } },
      );

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      rerender({ paused: true });

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Timer ticks — uses fake timers + act()
  //  React batches updates inside act(), but state assertions
  //  work because act() flushes after the promise resolves.
  // ═══════════════════════════════════════════════════════

  describe('timer ticks', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should decrement globalTime by 1 per second', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 5, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      await tick();
      expect(result.current.globalTime).toBe(4);

      await tick();
      expect(result.current.globalTime).toBe(3);
    });

    it('should decrement questionTime by 1 per second', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 5, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      await tick();
      expect(result.current.questionTime).toBe(9);

      await tick();
      expect(result.current.questionTime).toBe(8);
    });

    it('should not decrement globalTime below 0', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 2, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      await tick(); // 2 → 1
      expect(result.current.globalTime).toBe(1);

      await tick(); // 1 → 0
      expect(result.current.globalTime).toBe(0);

      await tick(); // stays at 0 (updater returns 0 when prev ≤ 0)
      expect(result.current.globalTime).toBe(0);
    });

    it('should not decrement questionTime below 0', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 10, questionSeconds: 2,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      await tick(); // 2 → 1
      expect(result.current.questionTime).toBe(1);

      await tick(); // 1 → 0
      expect(result.current.questionTime).toBe(0);

      await tick(); // stays at 0
      expect(result.current.questionTime).toBe(0);
    });

    it('should not tick globalTime when totalSeconds = 0', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 0, questionSeconds: 5,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      // Advance 3 seconds to verify questionTime ticks while globalTime stays 0
      await tick(3000);

      expect(result.current.globalTime).toBe(0);
      expect(result.current.questionTime).toBe(2); // 5 - 3 = 2

      // Verify timeout did NOT fire (guarded by totalSeconds > 0)
      expect(onGlobalTimeout).not.toHaveBeenCalled();
    });

    it('should not tick questionTime when questionSeconds = 0 — and should not fire question timeout', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 5, questionSeconds: 0,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      await tick();
      await tick();

      expect(result.current.globalTime).toBe(3); // still ticks
      expect(result.current.questionTime).toBe(0);
      expect(onQuestionTimeout).not.toHaveBeenCalled();
    });

    it('should not tick questionTime when questionSeconds = 0', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 5, questionSeconds: 0,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      await tick();
      await tick();

      expect(result.current.globalTime).toBe(3); // still ticks
      expect(result.current.questionTime).toBe(0);
    });

    it('should update isGlobalLow dynamically as time decreases', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 62, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      expect(result.current.isGlobalLow).toBe(false);

      await tick();
      await tick();
      await tick();

      expect(result.current.isGlobalLow).toBe(true);
    });

    it('should update isQuestionLow dynamically as time decreases', async () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 10, questionSeconds: 12,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      await tick();
      expect(result.current.isQuestionLow).toBe(false);

      await tick();
      expect(result.current.isQuestionLow).toBe(false);

      await tick();
      expect(result.current.isQuestionLow).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Timeout callbacks — uses spy WITHOUT act()
  //
  //  React 18's act() batches state updates, which defers
  //  the execution of useState functional updaters. The hook
  //  relies on the updater running synchronously to set the
  //  isGlobalDone / isQuestionDone flags.
  //
  //  By calling the interval callback OUTSIDE act(), React
  //  uses synchronous rendering, the updater runs immediately,
  //  the flags are set, and timeout callbacks fire correctly.
  // ═══════════════════════════════════════════════════════

  describe('timeout callbacks', () => {
    let intervalCallback: () => void;
    const INTERVAL_ID = 42;

    beforeEach(() => {
      suppressActWarnings();

      vi.spyOn(global, 'setInterval').mockImplementation(
        (cb: () => void) => {
          intervalCallback = cb;
          return INTERVAL_ID as unknown as ReturnType<typeof setInterval>;
        },
      );
      vi.spyOn(global, 'clearInterval');
    });

    it('should call onGlobalTimeout when globalTime reaches 0', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 2, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback(); // 2 → 1 — no timeout yet
      expect(onGlobalTimeout).not.toHaveBeenCalled();

      intervalCallback(); // 1 → 0 — should fire
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);
    });

    it('should call onQuestionTimeout when questionTime reaches 0', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 10, questionSeconds: 2,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback(); // 2 → 1 — no timeout yet
      expect(onQuestionTimeout).not.toHaveBeenCalled();

      intervalCallback(); // 1 → 0 — should fire
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);
    });

    it('should clear interval on global timeout', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 1, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback(); // 1 → 0 — timeout fires, clearInterval called

      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);
      expect(vi.mocked(global.clearInterval)).toHaveBeenCalledWith(INTERVAL_ID);
    });

    it('should NOT fire onGlobalTimeout twice', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 2, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback(); // 2 → 1
      intervalCallback(); // 1 → 0 — first timeout
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);

      intervalCallback(); // stays at 0 — guarded by ref
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);
    });

    it('should NOT fire onQuestionTimeout twice', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 10, questionSeconds: 2,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback(); // 2 → 1
      intervalCallback(); // 1 → 0 — first timeout
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

      intervalCallback(); // stays at 0 — guarded by ref
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);
    });

    it('should call global and question timeouts independently', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 5, questionSeconds: 3,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback(); // 4, 2
      intervalCallback(); // 3, 1
      intervalCallback(); // 2, 0 — question timeout fires
      expect(onGlobalTimeout).not.toHaveBeenCalled();
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

      intervalCallback(); // 1, 0
      intervalCallback(); // 0, 0 — global timeout fires now
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1); // guarded
    });
  });

  // ═══════════════════════════════════════════════════════
  //  resetQuestionTimer — mixed approach:
  //  - State assertions via fake timers + act()
  //  - Timeout assertions via spy without act()
  // ═══════════════════════════════════════════════════════

  describe('resetQuestionTimer', () => {
    describe('state reset', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      it('should reset questionTime to questionSeconds', async () => {
        const { result } = renderHook(() =>
          useQuizTimer({
            totalSeconds: 10, questionSeconds: 5,
            onGlobalTimeout, onQuestionTimeout,
          }),
        );

        await tick();
        await tick();
        expect(result.current.questionTime).toBe(3);

        act(() => { result.current.resetQuestionTimer(); });
        expect(result.current.questionTime).toBe(5);
      });
    });

    describe('timeout re-fire after reset', () => {
      let intervalCallback: () => void;

      beforeEach(() => {
        suppressActWarnings();
        vi.spyOn(global, 'setInterval').mockImplementation(
          (cb: () => void) => {
            intervalCallback = cb;
            return 42 as unknown as ReturnType<typeof setInterval>;
          },
        );
      });

      it('should allow question timeout to fire again after reset', () => {
        const { result } = renderHook(() =>
          useQuizTimer({
            totalSeconds: 10, questionSeconds: 2,
            onGlobalTimeout, onQuestionTimeout,
          }),
        );

        intervalCallback(); // 2 → 1
        intervalCallback(); // 1 → 0 — first timeout
        expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

        // Reset the question timer
        act(() => { result.current.resetQuestionTimer(); });
        expect(result.current.questionTime).toBe(2);

        intervalCallback(); // 2 → 1
        expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

        intervalCallback(); // 1 → 0 — fires again
        expect(onQuestionTimeout).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Callback ref sync — spy without act()
  // ═══════════════════════════════════════════════════════

  describe('callback ref sync', () => {
    let intervalCallback: () => void;

    beforeEach(() => {
      suppressActWarnings();
      vi.spyOn(global, 'setInterval').mockImplementation(
        (cb: () => void) => {
          intervalCallback = cb;
          return 42 as unknown as ReturnType<typeof setInterval>;
        },
      );
    });

    it('should use latest onGlobalTimeout after rerender', () => {
      const oldTimeout = vi.fn();
      const newTimeout = vi.fn();

      const { rerender } = renderHook(
        (p: { cb: () => void }) =>
          useQuizTimer({
            totalSeconds: 2, questionSeconds: 10,
            onGlobalTimeout: p.cb,
            onQuestionTimeout,
          }),
        { initialProps: { cb: oldTimeout } },
      );

      rerender({ cb: newTimeout });

      intervalCallback(); // 2 → 1
      intervalCallback(); // 1 → 0 — should call new via ref

      expect(oldTimeout).not.toHaveBeenCalled();
      expect(newTimeout).toHaveBeenCalledTimes(1);
    });

    it('should use latest onQuestionTimeout after rerender', () => {
      const oldTimeout = vi.fn();
      const newTimeout = vi.fn();

      const { rerender } = renderHook(
        (p: { cb: () => void }) =>
          useQuizTimer({
            totalSeconds: 10, questionSeconds: 2,
            onGlobalTimeout,
            onQuestionTimeout: p.cb,
          }),
        { initialProps: { cb: oldTimeout } },
      );

      rerender({ cb: newTimeout });

      intervalCallback(); // 2 → 1
      intervalCallback(); // 1 → 0 — should call new via ref

      expect(oldTimeout).not.toHaveBeenCalled();
      expect(newTimeout).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Edge cases
  // ═══════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle totalSeconds = 0 and questionSeconds = 0 (no interval)', () => {
      const { result } = renderHook(() =>
        useQuizTimer({
          totalSeconds: 0, questionSeconds: 0,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      expect(result.current.globalTime).toBe(0);
      expect(result.current.questionTime).toBe(0);
      expect(result.current.isGlobalLow).toBe(false);
      expect(result.current.isQuestionLow).toBe(false);
    });

    it('should default isPaused to false', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      renderHook(() =>
        useQuizTimer({
          totalSeconds: 10, questionSeconds: 5,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });
  });
});
