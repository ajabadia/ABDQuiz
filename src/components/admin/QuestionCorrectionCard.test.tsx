// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QuestionCorrectionCard } from './QuestionCorrectionCard';
import type { AttemptDetailQuestion } from '@/actions/gradingTypes';

// ── Mocks ──────────────────────────────────────────────

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      correct: 'CORRECT',
      incorrect: 'INCORRECT',
      questionLabel: 'QUESTION',
      studentAnswer: 'STUDENT ANSWER',
      correctAnswer: 'CORRECT ANSWER',
      notAnswered: 'NOT ANSWERED',
      manualPoints: 'MANUAL POINTS',
      maxPoints: 'MAX',
      feedback: 'FEEDBACK',
      feedbackPlaceholder: 'Enter feedback...',
      optionIndex: 'Option',
      collapseQuestion: 'Collapse',
      expandQuestion: 'Expand',
      openTextBadge: 'OPEN TEXT',
      openTextNoCorrectAnswer: '— No predefined correct answer —',
    };
    if (params && 'count' in params) {
      return `${translations[key] ?? key} (count=${params.count})`;
    }
    return translations[key] ?? key;
  },
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="icon-alert-circle" />,
  CheckCircle2: () => <span data-testid="icon-check-circle" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  MessageSquare: () => <span data-testid="icon-message-square" />,
  FileText: () => <span data-testid="icon-file-text" />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => (
    <input data-testid="points-input" {...props} />
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => (
    <div data-testid="separator" className={className} />
  ),
}));

// ── Factories ──────────────────────────────────────────

function makeMCQuestion(overrides: Partial<AttemptDetailQuestion> = {}): AttemptDetailQuestion {
  return {
    questionIndex: 0,
    questionText: 'What is 2+2?',
    type: 'multiple_choice',
    options: ['1', '2', '3', '4'],
    correctOptionIndex: 3,
    selectedOptionIndex: 3,
    manualTextAnswer: undefined,
    isCorrect: true,
    status: 'correcta',
    timeSpentSeconds: 12,
    maxPoints: 1,
    ...overrides,
  };
}

function makeOpenTextQuestion(overrides: Partial<AttemptDetailQuestion> = {}): AttemptDetailQuestion {
  return {
    questionIndex: 1,
    questionText: 'Explain the concept of recursion.',
    type: 'open_text',
    options: [],
    correctOptionIndex: -1,
    selectedOptionIndex: undefined,
    manualTextAnswer: 'Recursion is when a function calls itself to solve smaller subproblems.',
    isCorrect: false,
    status: 'pending',
    timeSpentSeconds: 45,
    maxPoints: 5,
    ...overrides,
  };
}

// ── Helper ─────────────────────────────────────────────

function renderCard(question: AttemptDetailQuestion) {
  const callbacks = {
    onPointsChange: vi.fn(),
    onFeedbackChange: vi.fn(),
  };
  const view = render(
    <QuestionCorrectionCard
      question={question}
      points=""
      feedback=""
      onPointsChange={callbacks.onPointsChange}
      onFeedbackChange={callbacks.onFeedbackChange}
    />
  );
  return { ...callbacks, view };
}

// ── Tests: Multiple Choice ─────────────────────────────

describe('QuestionCorrectionCard — multiple_choice', () => {
  beforeEach(cleanup);

  it('renders the question number and text', () => {
    renderCard(makeMCQuestion());
    expect(screen.getByText('#1')).toBeDefined();
    // Question text appears in both header and body — use getAllByText
    const textNodes = screen.getAllByText('What is 2+2?');
    expect(textNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the correct badge when answer is correct', () => {
    renderCard(makeMCQuestion({ isCorrect: true }));
    expect(screen.getByText('CORRECT')).toBeDefined();
  });

  it('shows the incorrect badge when answer is wrong', () => {
    renderCard(makeMCQuestion({ isCorrect: false }));
    expect(screen.getByText('INCORRECT')).toBeDefined();
  });

  it('renders student answer and correct answer panels', () => {
    renderCard(makeMCQuestion({ selectedOptionIndex: 0, correctOptionIndex: 1 }));
    // Student answer panel — shows the selected option
    expect(screen.getByText('1')).toBeDefined();
    // Correct answer panel — shows the correct option (different from selected to avoid ambiguity)
    expect(screen.getByText('2')).toBeDefined();
    // Both icons present
    expect(screen.getByTestId('icon-alert-circle')).toBeDefined();
    expect(screen.getByTestId('icon-check-circle')).toBeDefined();
  });

  it('shows notAnswered when no option selected', () => {
    renderCard(makeMCQuestion({ selectedOptionIndex: null }));
    expect(screen.getByText('NOT ANSWERED')).toBeDefined();
  });

  it('displays the time spent', () => {
    renderCard(makeMCQuestion({ timeSpentSeconds: 30 }));
    expect(screen.getByText('30s')).toBeDefined();
  });

  it('does NOT render the DESARROLLO badge', () => {
    renderCard(makeMCQuestion());
    expect(screen.queryByText('OPEN TEXT')).toBeNull();
  });

  it('is expanded by default and collapses on header click', () => {
    renderCard(makeMCQuestion());
    // Detail sections are visible by default
    expect(screen.getByText('QUESTION')).toBeDefined();
    expect(screen.getByText('MANUAL POINTS')).toBeDefined();

    // Click header to collapse
    const header = screen.getByText('#1').closest('button')!;
    fireEvent.click(header);

    // Detail sections hidden
    expect(screen.queryByText('QUESTION')).toBeNull();
    expect(screen.queryByText('MANUAL POINTS')).toBeNull();
  });

  it('renders points input with max points label', () => {
    renderCard(makeMCQuestion({ maxPoints: 2 }));
    expect(screen.getByText(/MAX.*2/)).toBeDefined();
    expect(screen.getByTestId('points-input')).toBeDefined();
  });

  it('renders feedback textarea with placeholder', () => {
    renderCard(makeMCQuestion());
    const textarea = screen.getByPlaceholderText('Enter feedback...');
    expect(textarea).toBeDefined();
  });

  it('calls onPointsChange when points input changes', () => {
    const { onPointsChange } = renderCard(makeMCQuestion());
    const input = screen.getByTestId('points-input');
    fireEvent.change(input, { target: { value: '1' } });
    expect(onPointsChange).toHaveBeenCalledWith('1');
  });

  it('calls onFeedbackChange when feedback textarea changes', () => {
    const { onFeedbackChange } = renderCard(makeMCQuestion());
    const textarea = screen.getByPlaceholderText('Enter feedback...');
    fireEvent.change(textarea, { target: { value: 'Great answer!' } });
    expect(onFeedbackChange).toHaveBeenCalledWith('Great answer!');
  });
});

// ── Tests: Open Text ──────────────────────────────────

describe('QuestionCorrectionCard — open_text', () => {
  beforeEach(cleanup);

  it('renders the question number and text', () => {
    renderCard(makeOpenTextQuestion());
    expect(screen.getByText('#2')).toBeDefined();
    // Question text appears in both header and body — use getAllByText
    const textNodes = screen.getAllByText('Explain the concept of recursion.');
    expect(textNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the DESARROLLO badge', () => {
    renderCard(makeOpenTextQuestion());
    expect(screen.getByText('OPEN TEXT')).toBeDefined();
  });

  it('does NOT show correct/incorrect badge', () => {
    renderCard(makeOpenTextQuestion());
    expect(screen.queryByText('CORRECT')).toBeNull();
    expect(screen.queryByText('INCORRECT')).toBeNull();
  });

  it('renders the student written answer in an amber panel', () => {
    renderCard(makeOpenTextQuestion());
    expect(
      screen.getByText('Recursion is when a function calls itself to solve smaller subproblems.')
    ).toBeDefined();
    // FileText icon present for open text
    expect(screen.getByTestId('icon-file-text')).toBeDefined();
  });

  it('shows notAnswered when no text answer provided', () => {
    renderCard(makeOpenTextQuestion({ manualTextAnswer: '' }));
    expect(screen.getByText('NOT ANSWERED')).toBeDefined();
  });

  it('shows notAnswered when text answer is whitespace', () => {
    renderCard(makeOpenTextQuestion({ manualTextAnswer: '   ' }));
    expect(screen.getByText('NOT ANSWERED')).toBeDefined();
  });

  it('does not render the correct/incorrect answer grid for open text', () => {
    renderCard(makeOpenTextQuestion());
    // Open text doesn't render the 2-column grid with icons
    expect(screen.queryByTestId('icon-alert-circle')).toBeNull();
    expect(screen.queryByTestId('icon-check-circle')).toBeNull();
    // The "CORRECT ANSWER" label for the grid column is not rendered
    expect(screen.queryByText('CORRECT ANSWER')).toBeNull();
  });

  it('displays the time spent', () => {
    renderCard(makeOpenTextQuestion({ timeSpentSeconds: 120 }));
    expect(screen.getByText('120s')).toBeDefined();
  });

  it('renders points input with max points label', () => {
    renderCard(makeOpenTextQuestion({ maxPoints: 5 }));
    expect(screen.getByText(/MAX.*5/)).toBeDefined();
    expect(screen.getByTestId('points-input')).toBeDefined();
  });

  it('renders feedback textarea for open text as well', () => {
    renderCard(makeOpenTextQuestion());
    const textarea = screen.getByPlaceholderText('Enter feedback...');
    expect(textarea).toBeDefined();
  });

  it('calls onPointsChange callback', () => {
    const { onPointsChange } = renderCard(makeOpenTextQuestion());
    const input = screen.getByTestId('points-input');
    fireEvent.change(input, { target: { value: '4' } });
    expect(onPointsChange).toHaveBeenCalledWith('4');
  });

  it('calls onFeedbackChange callback', () => {
    const { onFeedbackChange } = renderCard(makeOpenTextQuestion());
    const textarea = screen.getByPlaceholderText('Enter feedback...');
    fireEvent.change(textarea, { target: { value: 'Good explanation!' } });
    expect(onFeedbackChange).toHaveBeenCalledWith('Good explanation!');
  });

  it('is collapsed and expanded by header click', () => {
    renderCard(makeOpenTextQuestion());
    // Starts expanded
    expect(screen.getByText('STUDENT ANSWER')).toBeDefined();

    // Collapse
    const header = screen.getByText('#2').closest('button')!;
    fireEvent.click(header);
    expect(screen.queryByText('STUDENT ANSWER')).toBeNull();

    // Re-expand
    fireEvent.click(header);
    expect(screen.getByText('STUDENT ANSWER')).toBeDefined();
  });
});

// ── Tests: Edge cases ─────────────────────────────────

describe('QuestionCorrectionCard — edge cases', () => {
  beforeEach(cleanup);

  it('handles selected option display for multi-choice', () => {
    const q = makeMCQuestion({ selectedOptionIndex: 0, correctOptionIndex: 1, options: ['A', 'B', 'C', 'D'] });
    renderCard(q);
    // Selected option 'A' is unique in the DOM (student answer panel only)
    expect(screen.getByText('A')).toBeDefined();
    // Correct option 'B' is also unique
    expect(screen.getByText('B')).toBeDefined();
  });

  it('shows option index fallback when selected index is out of bounds', () => {
    const q = makeMCQuestion({ selectedOptionIndex: 99 });
    renderCard(q);
    expect(screen.getByText(/Option.*99/)).toBeDefined();
  });

  it('shows option index fallback for correct answer when index is out of bounds', () => {
    const q = makeMCQuestion({ correctOptionIndex: 99, selectedOptionIndex: 0 });
    renderCard(q);
    // Renders "Option 99" fallback in the correct answer panel
    expect(screen.getByText(/Option.*99/)).toBeDefined();
  });

  it('passes correct aria-label on collapse button', () => {
    renderCard(makeMCQuestion());
    const btn = screen.getByLabelText(/Collapse/);
    expect(btn).toBeDefined();
  });

  it('passes correct aria-label on expand button after collapse', () => {
    renderCard(makeMCQuestion());
    const header = screen.getByText('#1').closest('button')!;
    fireEvent.click(header);
    const btn = screen.getByLabelText(/Expand/);
    expect(btn).toBeDefined();
  });

  it('renders chevron-down when expanded and chevron-right when collapsed', () => {
    renderCard(makeMCQuestion());
    // Expanded: chevron-down visible
    expect(screen.getByTestId('icon-chevron-down')).toBeDefined();
    expect(screen.queryByTestId('icon-chevron-right')).toBeNull();

    // Collapse
    const header = screen.getByText('#1').closest('button')!;
    fireEvent.click(header);

    expect(screen.getByTestId('icon-chevron-right')).toBeDefined();
    expect(screen.queryByTestId('icon-chevron-down')).toBeNull();
  });

  it('uses pre-filled points and feedback values', () => {
    const q = makeOpenTextQuestion();
    render(
      <QuestionCorrectionCard
        question={q}
        points="4"
        feedback="Well explained!"
        onPointsChange={vi.fn()}
        onFeedbackChange={vi.fn()}
      />
    );
    const input = screen.getByTestId('points-input') as HTMLInputElement;
    expect(input.value).toBe('4');

    const textarea = screen.getByPlaceholderText('Enter feedback...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Well explained!');
  });
});
