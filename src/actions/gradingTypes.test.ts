import { describe, it, expect } from 'vitest';
import { extractOpenTextPreview } from './gradingTypes';

describe('extractOpenTextPreview', () => {
  it('returns undefined when no questions field', () => {
    const result = extractOpenTextPreview({ _id: 'x' });
    expect(result).toBeUndefined();
  });

  it('returns undefined when questions array is empty', () => {
    const result = extractOpenTextPreview({ _id: 'x', questions: [] });
    expect(result).toBeUndefined();
  });

  it('returns undefined when no open_text questions exist', () => {
    const raw = {
      _id: 'x',
      questions: [
        {
          questionSnapshot: { questionText: 'MC Q', type: 'multiple_choice', options: [] },
          selectedOptionIndex: 0,
          isCorrect: true,
          status: 'correcta',
          timeSpentSeconds: 10,
        },
      ],
    };
    const result = extractOpenTextPreview(raw);
    expect(result).toBeUndefined();
  });

  it('extracts open_text answers with full text when <= 120 chars', () => {
    const raw = {
      _id: 'x',
      questions: [
        {
          questionSnapshot: { questionText: 'Explain recursion', type: 'open_text' },
          manualTextAnswer: 'A function that calls itself.',
          isCorrect: false,
          status: 'pending',
          timeSpentSeconds: 30,
        },
      ],
    };
    const result = extractOpenTextPreview(raw);
    expect(result).toEqual([
      { questionText: 'Explain recursion', answerSnippet: 'A function that calls itself.' },
    ]);
  });

  it('truncates answers longer than 120 chars', () => {
    const longAnswer = 'A'.repeat(150);
    const raw = {
      _id: 'x',
      questions: [
        {
          questionSnapshot: { questionText: 'Long answer question', type: 'open_text' },
          manualTextAnswer: longAnswer,
          isCorrect: false,
          status: 'pending',
          timeSpentSeconds: 60,
        },
      ],
    };
    const result = extractOpenTextPreview(raw);
    expect(result).toHaveLength(1);
    expect(result![0].answerSnippet).toBe('A'.repeat(117) + '...');
    expect(result![0].answerSnippet.length).toBe(120);
  });

  it('skips open_text questions with empty manualTextAnswer', () => {
    const raw = {
      _id: 'x',
      questions: [
        {
          questionSnapshot: { questionText: 'Skipped', type: 'open_text' },
          manualTextAnswer: '',
          isCorrect: false,
          status: 'pending',
          timeSpentSeconds: 5,
        },
        {
          questionSnapshot: { questionText: 'Answered', type: 'open_text' },
          manualTextAnswer: 'Real answer here.',
          isCorrect: false,
          status: 'pending',
          timeSpentSeconds: 30,
        },
      ],
    };
    const result = extractOpenTextPreview(raw);
    expect(result).toHaveLength(1);
    expect(result![0].questionText).toBe('Answered');
  });

  it('skips open_text questions with whitespace-only manualTextAnswer', () => {
    const raw = {
      _id: 'x',
      questions: [
        {
          questionSnapshot: { questionText: 'Whitespace only', type: 'open_text' },
          manualTextAnswer: '   ',
          isCorrect: false,
          status: 'pending',
          timeSpentSeconds: 10,
        },
      ],
    };
    const result = extractOpenTextPreview(raw);
    expect(result).toBeUndefined();
  });

  it('handles multiple open_text questions in the same attempt', () => {
    const raw = {
      _id: 'x',
      questions: [
        {
          questionSnapshot: { questionText: 'Q1', type: 'open_text' },
          manualTextAnswer: 'Answer one.',
          isCorrect: false,
          status: 'pending',
          timeSpentSeconds: 20,
        },
        {
          questionSnapshot: { questionText: 'Q2', type: 'open_text' },
          manualTextAnswer: 'Answer two.',
          isCorrect: false,
          status: 'pending',
          timeSpentSeconds: 25,
        },
      ],
    };
    const result = extractOpenTextPreview(raw);
    expect(result).toHaveLength(2);
    expect(result![0].answerSnippet).toBe('Answer one.');
    expect(result![1].answerSnippet).toBe('Answer two.');
  });

  it('ignores questions without questionSnapshot', () => {
    const raw = {
      _id: 'x',
      questions: [
        { selectedOptionIndex: 0, isCorrect: true },
      ],
    };
    const result = extractOpenTextPreview(raw);
    expect(result).toBeUndefined();
  });
});
