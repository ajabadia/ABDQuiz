// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAIFeedback } from './useAIFeedback';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/actions/feedback', () => ({
  generateQuestionFeedbackAction: vi.fn(),
}));

import * as FeedbackMod from '@/actions/feedback';

const { generateQuestionFeedbackAction } = FeedbackMod as unknown as {
  generateQuestionFeedbackAction: ReturnType<typeof vi.fn>;
};

// ── Tests ──────────────────────────────────────────────

describe('useAIFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Sync behaviour ────

  it('should return empty maps initially', () => {
    const { result } = renderHook(() =>
      useAIFeedback(false, 0, 'attempt-1'),
    );

    expect(result.current.aiFeedbackMap).toEqual({});
    expect(result.current.aiFeedbackLoading).toEqual({});
    expect(generateQuestionFeedbackAction).not.toHaveBeenCalled();
  });

  it('should not call API when showFeedback stays false', () => {
    const { rerender } = renderHook(
      (p: { show: boolean; index: number; id: string }) =>
        useAIFeedback(p.show, p.index, p.id),
      { initialProps: { show: false, index: 0, id: 'attempt-1' } },
    );

    expect(generateQuestionFeedbackAction).not.toHaveBeenCalled();

    rerender({ show: false, index: 1, id: 'attempt-1' });
    expect(generateQuestionFeedbackAction).not.toHaveBeenCalled();
  });

  it('should set loading true synchronously when showFeedback becomes true', () => {
    generateQuestionFeedbackAction.mockReturnValue(
      new Promise(() => { /* never resolves */ }),
    );

    const { result, rerender } = renderHook(
      (p: { show: boolean; index: number; id: string }) =>
        useAIFeedback(p.show, p.index, p.id),
      { initialProps: { show: false, index: 0, id: 'attempt-1' } },
    );

    rerender({ show: true, index: 0, id: 'attempt-1' });

    // Loading is set synchronously inside the effect
    expect(result.current.aiFeedbackLoading[0]).toBe(true);
    expect(generateQuestionFeedbackAction).toHaveBeenCalledWith('attempt-1', 0);
    expect(generateQuestionFeedbackAction).toHaveBeenCalledTimes(1);
    expect(result.current.aiFeedbackMap[0]).toBeUndefined();
  });

  it('should set loading for the correct question index', () => {
    generateQuestionFeedbackAction.mockReturnValue(
      new Promise(() => { /* never resolves */ }),
    );

    const { result, rerender } = renderHook(
      (p: { show: boolean; index: number; id: string }) =>
        useAIFeedback(p.show, p.index, p.id),
      { initialProps: { show: false, index: 2, id: 'attempt-1' } },
    );

    rerender({ show: true, index: 2, id: 'attempt-1' });

    expect(result.current.aiFeedbackLoading[2]).toBe(true);
    expect(result.current.aiFeedbackLoading[0]).toBeUndefined();
  });

  it('should store feedback and clear loading when API succeeds', async () => {
    generateQuestionFeedbackAction.mockResolvedValue({
      success: true,
      feedback: 'Excelente respuesta!',
    });

    const { result, rerender } = renderHook(
      (p: { show: boolean; index: number; id: string }) =>
        useAIFeedback(p.show, p.index, p.id),
      { initialProps: { show: false, index: 0, id: 'attempt-1' } },
    );

    rerender({ show: true, index: 0, id: 'attempt-1' });

    await waitFor(() => {
      expect(result.current.aiFeedbackMap[0]).toBe('Excelente respuesta!');
    });

    expect(result.current.aiFeedbackLoading[0]).toBe(false);
  });

  it('should clear loading when API fails', async () => {
    generateQuestionFeedbackAction.mockRejectedValue(new Error('API error'));

    const { result, rerender } = renderHook(
      (p: { show: boolean; index: number; id: string }) =>
        useAIFeedback(p.show, p.index, p.id),
      { initialProps: { show: false, index: 0, id: 'attempt-1' } },
    );

    rerender({ show: true, index: 0, id: 'attempt-1' });

    await waitFor(() => {
      expect(result.current.aiFeedbackLoading[0]).toBe(false);
    });

    expect(result.current.aiFeedbackMap[0]).toBeUndefined();
  });
});
