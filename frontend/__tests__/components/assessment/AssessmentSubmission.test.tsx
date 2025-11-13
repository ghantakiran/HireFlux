/**
 * Tests for AssessmentSubmission Component - Sprint 19-20 Week 38 Day 4
 * Following TDD approach: Write tests first, then implement component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssessmentSubmission } from '@/components/assessment/AssessmentSubmission';

describe('AssessmentSubmission Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockAnswers = {
    q1: { selected_options: ['Option A'] },
    q2: { text_response: 'My answer here' },
    q3: { code_response: 'function test() { return true; }' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render submit button', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should show answered questions count', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/3 of 5 questions answered/i)).toBeInTheDocument();
  });

  it('should show completion percentage', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/60%/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Validation Tests
  // ========================================================================

  it('should show warning when not all questions answered', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/2 questions unanswered/i)).toBeInTheDocument();
  });

  it('should show success message when all questions answered', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/all questions answered/i)).toBeInTheDocument();
  });

  it('should disable submit button when no answers provided', () => {
    render(
      <AssessmentSubmission
        answers={{}}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  // ========================================================================
  // Confirmation Modal Tests
  // ========================================================================

  it('should show confirmation modal when submit clicked', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/confirm submission/i)).toBeInTheDocument();
  });

  it('should show warning in modal if not all questions answered', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/you have 2 unanswered questions/i)).toBeInTheDocument();
  });

  it('should close modal when cancel clicked', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/confirm submission/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/confirm submission/i)).not.toBeInTheDocument();
  });

  it('should call onSubmit when confirmed', async () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(mockAnswers);
    });
  });

  // ========================================================================
  // Loading State Tests
  // ========================================================================

  it('should show loading state when submitting', async () => {
    const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={slowSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    // Check for the status message specifically
    expect(screen.getByText(/submitting your assessment/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(slowSubmit).toHaveBeenCalled();
    });
  });

  it('should disable buttons during submission', async () => {
    const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={slowSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });
  });

  // ========================================================================
  // Time Tracking Tests
  // ========================================================================

  it('should display time spent on assessment', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
        timeSpentSeconds={1825} // 30 minutes 25 seconds
      />
    );

    expect(screen.getByText(/30m 25s/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Progress Bar Tests
  // ========================================================================

  it('should render progress bar', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={5}
        onSubmit={mockOnSubmit}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
  });

  it('should show 100% progress when all answered', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have accessible submit button', () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toHaveAccessibleName();
  });

  it('should announce submission status to screen readers', async () => {
    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  it('should handle empty answers object', () => {
    render(
      <AssessmentSubmission
        answers={{}}
        totalQuestions={3}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/0 of 3 questions answered/i)).toBeInTheDocument();
  });

  it('should handle submission error', async () => {
    const errorSubmit = jest.fn(() => Promise.reject(new Error('Submission failed')));

    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={errorSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      // Check that error message appears (will have multiple instances)
      const errorMessages = screen.getAllByText(/submission failed/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should allow retry after error', async () => {
    const errorSubmit = jest.fn(() => Promise.reject(new Error('Submission failed')));

    render(
      <AssessmentSubmission
        answers={mockAnswers}
        totalQuestions={3}
        onSubmit={errorSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/submission failed/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    // Should show retry button
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
