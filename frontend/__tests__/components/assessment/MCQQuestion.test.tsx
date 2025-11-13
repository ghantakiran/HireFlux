/**
 * Tests for MCQQuestion Component - Sprint 19-20 Week 38 Day 3
 * Following TDD approach: Write tests first, then implement component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MCQQuestion } from '@/components/assessment/MCQQuestion';

describe('MCQQuestion Component', () => {
  const mockQuestion = {
    id: 'q1',
    question_text: 'What is the capital of France?',
    question_type: 'mcq_single' as const,
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    points: 10,
  };

  const mockOnAnswerChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render question text', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });

  it('should render all options', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('should show points value', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByText('10 points')).toBeInTheDocument();
  });

  // ========================================================================
  // Single Choice Tests
  // ========================================================================

  it('should render radio buttons for single choice', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(4);
  });

  it('should select option when clicked (single choice)', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const parisOption = screen.getByLabelText('Paris');
    fireEvent.click(parisOption);

    expect(mockOnAnswerChange).toHaveBeenCalledWith({
      selected_options: ['Paris'],
    });
  });

  it('should replace selection when another option clicked (single choice)', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    fireEvent.click(screen.getByLabelText('London'));
    fireEvent.click(screen.getByLabelText('Paris'));

    expect(mockOnAnswerChange).toHaveBeenLastCalledWith({
      selected_options: ['Paris'],
    });
  });

  it('should show selected option with visual feedback', () => {
    render(
      <MCQQuestion
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
        value={{ selected_options: ['Paris'] }}
      />
    );

    const parisOption = screen.getByLabelText('Paris') as HTMLInputElement;
    expect(parisOption.checked).toBe(true);
  });

  // ========================================================================
  // Multiple Choice Tests
  // ========================================================================

  it('should render checkboxes for multiple choice', () => {
    const multipleQuestion = {
      ...mockQuestion,
      question_type: 'mcq_multiple' as const,
      question_text: 'Select all European capitals:',
    };

    render(<MCQQuestion question={multipleQuestion} onAnswerChange={mockOnAnswerChange} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
  });

  it('should allow multiple selections', () => {
    const multipleQuestion = {
      ...mockQuestion,
      question_type: 'mcq_multiple' as const,
    };

    // Use a stateful wrapper to simulate controlled component behavior
    function ControlledMCQ() {
      const [value, setValue] = React.useState<{ selected_options: string[] }>({
        selected_options: [],
      });

      return (
        <MCQQuestion
          question={multipleQuestion}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledMCQ />);

    fireEvent.click(screen.getByLabelText('Paris'));
    fireEvent.click(screen.getByLabelText('London'));

    // Should be called twice, and last call should have both selections
    expect(mockOnAnswerChange).toHaveBeenCalledTimes(2);
    expect(mockOnAnswerChange).toHaveBeenLastCalledWith({
      selected_options: expect.arrayContaining(['Paris', 'London']),
    });
  });

  it('should toggle selection when clicked again (multiple choice)', () => {
    const multipleQuestion = {
      ...mockQuestion,
      question_type: 'mcq_multiple' as const,
    };

    render(
      <MCQQuestion
        question={multipleQuestion}
        onAnswerChange={mockOnAnswerChange}
        value={{ selected_options: ['Paris', 'London'] }}
      />
    );

    // Uncheck Paris
    fireEvent.click(screen.getByLabelText('Paris'));

    expect(mockOnAnswerChange).toHaveBeenCalledWith({
      selected_options: ['London'],
    });
  });

  it('should show all selected options with visual feedback (multiple choice)', () => {
    const multipleQuestion = {
      ...mockQuestion,
      question_type: 'mcq_multiple' as const,
    };

    render(
      <MCQQuestion
        question={multipleQuestion}
        onAnswerChange={mockOnAnswerChange}
        value={{ selected_options: ['Paris', 'London'] }}
      />
    );

    const parisCheckbox = screen.getByLabelText('Paris') as HTMLInputElement;
    const londonCheckbox = screen.getByLabelText('London') as HTMLInputElement;

    expect(parisCheckbox.checked).toBe(true);
    expect(londonCheckbox.checked).toBe(true);
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have proper ARIA labels', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby');
  });

  it('should support keyboard navigation', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const firstOption = screen.getByLabelText('London');
    firstOption.focus();

    expect(document.activeElement).toBe(firstOption);
  });

  it('should have unique ids for radio buttons', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const radioButtons = screen.getAllByRole('radio');
    const ids = radioButtons.map(rb => rb.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(radioButtons.length);
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  it('should handle empty options array', () => {
    const emptyQuestion = {
      ...mockQuestion,
      options: [],
    };

    render(<MCQQuestion question={emptyQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('should handle undefined value', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const radioButtons = screen.getAllByRole('radio') as HTMLInputElement[];
    radioButtons.forEach(rb => {
      expect(rb.checked).toBe(false);
    });
  });

  it('should handle single option', () => {
    const singleOptionQuestion = {
      ...mockQuestion,
      options: ['Only Option'],
    };

    render(<MCQQuestion question={singleOptionQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText('Only Option')).toBeInTheDocument();
  });

  // ========================================================================
  // Validation Tests
  // ========================================================================

  it('should show required indicator when required', () => {
    render(<MCQQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should show error message when provided', () => {
    render(
      <MCQQuestion
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Please select an answer"
      />
    );

    expect(screen.getByText('Please select an answer')).toBeInTheDocument();
  });

  it('should apply error styling when error is present', () => {
    render(
      <MCQQuestion
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Error message"
      />
    );

    const container = screen.getByRole('group');
    expect(container.className).toMatch(/error|border-red/);
  });
});
