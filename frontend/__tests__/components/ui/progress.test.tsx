/**
 * Tests for Progress Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from '@/components/ui/progress';

describe('Progress Component', () => {
  it('should render with default props', () => {
    render(<Progress />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should display correct progress percentage', () => {
    render(<Progress value={50} />);
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');

    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressFill).toHaveStyle({ width: '50%' });
  });

  it('should handle zero value', () => {
    render(<Progress value={0} />);
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');

    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });

  it('should handle 100% value', () => {
    render(<Progress value={100} />);
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');

    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('should clamp values below 0', () => {
    render(<Progress value={-10} />);
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');

    expect(progressFill).toHaveStyle({ width: '0%' });
  });

  it('should clamp values above max', () => {
    render(<Progress value={150} />);
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');

    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('should support custom max value', () => {
    render(<Progress value={25} max={50} />);
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');

    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    expect(progressBar).toHaveAttribute('aria-valuemax', '50');
    expect(progressFill).toHaveStyle({ width: '50%' });
  });

  it('should apply custom className', () => {
    render(<Progress className="custom-progress" />);
    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('custom-progress');
  });

  it('should have correct base styles', () => {
    render(<Progress />);
    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('w-full', 'bg-gray-200', 'rounded-full', 'h-2');
  });

  it('should have transition class on fill', () => {
    render(<Progress />);
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');

    expect(progressFill).toHaveClass('transition-all', 'duration-300');
  });
});
