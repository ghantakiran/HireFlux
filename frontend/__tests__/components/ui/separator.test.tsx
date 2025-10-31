/**
 * Tests for Separator Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Separator } from '@/components/ui/separator';

describe('Separator Component', () => {
  it('should render horizontal separator by default', () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId('separator');

    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('role', 'separator');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('should render vertical separator', () => {
    render(<Separator orientation="vertical" data-testid="separator" />);
    const separator = screen.getByTestId('separator');

    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveClass('h-full', 'w-px');
  });

  it('should apply correct classes for horizontal orientation', () => {
    render(<Separator orientation="horizontal" data-testid="separator" />);
    const separator = screen.getByTestId('separator');

    expect(separator).toHaveClass('h-px', 'w-full');
  });

  it('should apply custom className', () => {
    render(<Separator className="custom-separator" data-testid="separator" />);
    const separator = screen.getByTestId('separator');

    expect(separator).toHaveClass('custom-separator');
  });

  it('should have correct base styles', () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId('separator');

    expect(separator).toHaveClass('bg-gray-200');
  });

  it('should support decorative role', () => {
    render(<Separator decorative data-testid="separator" />);
    const separator = screen.getByTestId('separator');

    // When decorative, it should not have role="separator"
    expect(separator).not.toHaveAttribute('role', 'separator');
  });
});
