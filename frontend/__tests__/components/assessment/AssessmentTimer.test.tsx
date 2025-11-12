/**
 * Tests for AssessmentTimer Component - Sprint 19-20 Week 38 Day 2
 * Following TDD approach: Write tests first, then implement component
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssessmentTimer } from '@/components/assessment/AssessmentTimer';

// Mock timers for consistent testing
jest.useFakeTimers();

describe('AssessmentTimer Component', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  // ========================================================================
  // Basic Rendering Tests
  // ========================================================================

  it('should render timer with correct initial time', () => {
    render(<AssessmentTimer timeRemaining={3600} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveTextContent('60:00'); // 3600 seconds = 60 minutes
  });

  it('should display time in MM:SS format', () => {
    render(<AssessmentTimer timeRemaining={125} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('02:05'); // 125 seconds = 2 minutes 5 seconds
  });

  it('should handle zero time remaining', () => {
    render(<AssessmentTimer timeRemaining={0} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('00:00');
  });

  it('should have clock icon', () => {
    render(<AssessmentTimer timeRemaining={3600} onTimeExpired={jest.fn()} />);

    // Check for the timer container with aria-label
    const container = screen.getByLabelText(/60 minutes remaining/i);
    expect(container).toBeInTheDocument();

    // Check that clock icon is rendered (it has aria-hidden, so check by class)
    const clockIcon = container.querySelector('svg.lucide-clock');
    expect(clockIcon).toBeInTheDocument();
  });

  // ========================================================================
  // Countdown Logic Tests
  // ========================================================================

  it('should countdown by 1 second every second', async () => {
    render(<AssessmentTimer timeRemaining={10} onTimeExpired={jest.fn()} />);

    expect(screen.getByRole('timer')).toHaveTextContent('00:10');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByRole('timer')).toHaveTextContent('00:09');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByRole('timer')).toHaveTextContent('00:08');
  });

  it('should call onTimeExpired when timer reaches zero', async () => {
    const onTimeExpired = jest.fn();
    render(<AssessmentTimer timeRemaining={3} onTimeExpired={onTimeExpired} />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(onTimeExpired).toHaveBeenCalledTimes(1);
    });
  });

  it('should not go below zero', async () => {
    const onTimeExpired = jest.fn();
    render(<AssessmentTimer timeRemaining={2} onTimeExpired={onTimeExpired} />);

    act(() => {
      jest.advanceTimersByTime(5000); // Advance more than needed
    });

    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(onTimeExpired).toHaveBeenCalledTimes(1); // Only called once
  });

  // ========================================================================
  // Color-Coded Warning Tests
  // ========================================================================

  it('should have green color when time > 10 minutes', () => {
    render(<AssessmentTimer timeRemaining={660} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/text-green/);
  });

  it('should have yellow color when time is 5-10 minutes', () => {
    render(<AssessmentTimer timeRemaining={420} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/text-yellow/);
  });

  it('should have red color when time < 5 minutes', () => {
    render(<AssessmentTimer timeRemaining={240} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/text-red/);
  });

  it('should transition from green to yellow at 10 minutes', () => {
    const { rerender } = render(<AssessmentTimer timeRemaining={601} onTimeExpired={jest.fn()} />);

    let timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/text-green/);

    rerender(<AssessmentTimer timeRemaining={599} onTimeExpired={jest.fn()} />);

    timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/text-yellow/);
  });

  it('should transition from yellow to red at 5 minutes', () => {
    const { rerender } = render(<AssessmentTimer timeRemaining={301} onTimeExpired={jest.fn()} />);

    let timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/text-yellow/);

    rerender(<AssessmentTimer timeRemaining={299} onTimeExpired={jest.fn()} />);

    timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/text-red/);
  });

  // ========================================================================
  // Warning Callback Tests
  // ========================================================================

  it('should call onWarning callback at 5 minutes', async () => {
    const onWarning = jest.fn();
    render(
      <AssessmentTimer
        timeRemaining={301}
        onTimeExpired={jest.fn()}
        onWarning={onWarning}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1000); // Tick to 300 seconds (5 minutes)
    });

    await waitFor(() => {
      expect(onWarning).toHaveBeenCalledWith(5);
    });
  });

  it('should call onWarning callback at 1 minute', async () => {
    const onWarning = jest.fn();
    render(
      <AssessmentTimer
        timeRemaining={61}
        onTimeExpired={jest.fn()}
        onWarning={onWarning}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1000); // Tick to 60 seconds (1 minute)
    });

    await waitFor(() => {
      expect(onWarning).toHaveBeenCalledWith(1);
    });
  });

  it('should not call onWarning multiple times for same threshold', async () => {
    const onWarning = jest.fn();
    render(
      <AssessmentTimer
        timeRemaining={62}
        onTimeExpired={jest.fn()}
        onWarning={onWarning}
      />
    );

    act(() => {
      jest.advanceTimersByTime(2000); // Tick past 60 seconds
    });

    await waitFor(() => {
      expect(onWarning).toHaveBeenCalledTimes(1); // Only once for 1 minute
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have proper ARIA attributes', () => {
    render(<AssessmentTimer timeRemaining={3600} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer).toHaveAttribute('aria-live', 'polite');
    expect(timer).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have descriptive aria-label with time remaining', () => {
    render(<AssessmentTimer timeRemaining={125} onTimeExpired={jest.fn()} />);

    const container = screen.getByLabelText(/2 minutes 5 seconds remaining/i);
    expect(container).toBeInTheDocument();
  });

  it('should update aria-label as time changes', async () => {
    render(<AssessmentTimer timeRemaining={61} onTimeExpired={jest.fn()} />);

    expect(screen.getByLabelText(/1 minute 1 second remaining/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByLabelText(/1 minute remaining/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  it('should handle large time values correctly', () => {
    render(<AssessmentTimer timeRemaining={7200} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('120:00'); // 7200 seconds = 120 minutes
  });

  it('should handle single digit seconds with leading zero', () => {
    render(<AssessmentTimer timeRemaining={65} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('01:05'); // 65 seconds = 1 minute 5 seconds
  });

  it('should cleanup timer on unmount', () => {
    const { unmount } = render(<AssessmentTimer timeRemaining={100} onTimeExpired={jest.fn()} />);

    unmount();

    // Advance timers after unmount - should not cause errors
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // If timer wasn't cleaned up, this would cause memory leaks or errors
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should handle prop updates gracefully', () => {
    const { rerender } = render(<AssessmentTimer timeRemaining={100} onTimeExpired={jest.fn()} />);

    expect(screen.getByRole('timer')).toHaveTextContent('01:40');

    // Update timeRemaining prop
    rerender(<AssessmentTimer timeRemaining={200} onTimeExpired={jest.fn()} />);

    expect(screen.getByRole('timer')).toHaveTextContent('03:20');
  });

  // ========================================================================
  // Visual State Tests
  // ========================================================================

  it('should apply pulsing animation when time < 1 minute', () => {
    render(<AssessmentTimer timeRemaining={45} onTimeExpired={jest.fn()} />);

    const container = screen.getByRole('timer').parentElement;
    expect(container?.className).toMatch(/animate-pulse/);
  });

  it('should not pulse when time > 1 minute', () => {
    render(<AssessmentTimer timeRemaining={120} onTimeExpired={jest.fn()} />);

    const container = screen.getByRole('timer').parentElement;
    expect(container?.className).not.toMatch(/animate-pulse/);
  });

  it('should have bold font weight when time < 5 minutes', () => {
    render(<AssessmentTimer timeRemaining={240} onTimeExpired={jest.fn()} />);

    const timer = screen.getByRole('timer');
    expect(timer.className).toMatch(/font-bold/);
  });
});
