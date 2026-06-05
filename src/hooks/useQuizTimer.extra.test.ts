// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizTimer } from './useQuizTimer';

// ── Helpers ───────────────────────────────────────────────

async function tick(ms = 1000) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

function suppressActWarnings() {
  vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
    if (typeof msg === 'string' && msg.includes('was not wrapped in act')) return;
    // eslint-disable-next-line no-console
    console.error(msg);
  });
}

// ── Tests ─────────────────────────────────────────────────

describe('useQuizTimer — Part 2', () => {
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
  //  Timeout callbacks
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

      intervalCallback();
      expect(onGlobalTimeout).not.toHaveBeenCalled();

      intervalCallback();
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);
    });

    it('should call onQuestionTimeout when questionTime reaches 0', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 10, questionSeconds: 2,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback();
      expect(onQuestionTimeout).not.toHaveBeenCalled();

      intervalCallback();
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);
    });

    it('should clear interval on global timeout', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 1, questionSeconds: 10,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback();

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

      intervalCallback();
      intervalCallback();
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);

      intervalCallback();
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);
    });

    it('should NOT fire onQuestionTimeout twice', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 10, questionSeconds: 2,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback();
      intervalCallback();
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

      intervalCallback();
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);
    });

    it('should call global and question timeouts independently', () => {
      renderHook(() =>
        useQuizTimer({
          totalSeconds: 5, questionSeconds: 3,
          onGlobalTimeout, onQuestionTimeout,
        }),
      );

      intervalCallback();
      intervalCallback();
      intervalCallback();
      expect(onGlobalTimeout).not.toHaveBeenCalled();
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

      intervalCallback();
      intervalCallback();
      expect(onGlobalTimeout).toHaveBeenCalledTimes(1);
      expect(onQuestionTimeout).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  resetQuestionTimer
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

        intervalCallback();
        intervalCallback();
        expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

        act(() => { result.current.resetQuestionTimer(); });
        expect(result.current.questionTime).toBe(2);

        intervalCallback();
        expect(onQuestionTimeout).toHaveBeenCalledTimes(1);

        intervalCallback();
        expect(onQuestionTimeout).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Callback ref sync
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

      intervalCallback();
      intervalCallback();

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

      intervalCallback();
      intervalCallback();

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
