/**
 * Tests for Switch Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from '@/components/ui/switch';

describe('Switch Component', () => {
  it('should render with default props', () => {
    render(<Switch />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('should render as checked when defaultChecked is true', () => {
    render(<Switch defaultChecked={true} />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('should toggle state when clicked (uncontrolled)', () => {
    render(<Switch />);
    const switchElement = screen.getByRole('switch');

    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(switchElement);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(switchElement);
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('should call onCheckedChange when toggled', () => {
    const handleChange = jest.fn();
    render(<Switch onCheckedChange={handleChange} />);
    const switchElement = screen.getByRole('switch');

    fireEvent.click(switchElement);
    expect(handleChange).toHaveBeenCalledWith(true);

    fireEvent.click(switchElement);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('should work as controlled component', () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <Switch checked={false} onCheckedChange={handleChange} />
    );
    const switchElement = screen.getByRole('switch');

    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(switchElement);
    expect(handleChange).toHaveBeenCalledWith(true);

    // Rerender with checked=true to simulate parent state update
    rerender(<Switch checked={true} onCheckedChange={handleChange} />);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Switch disabled />);
    const switchElement = screen.getByRole('switch');

    expect(switchElement).toBeDisabled();
    expect(switchElement).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('should not toggle when clicked while disabled', () => {
    const handleChange = jest.fn();
    render(<Switch disabled onCheckedChange={handleChange} />);
    const switchElement = screen.getByRole('switch');

    fireEvent.click(switchElement);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<Switch className="custom-class" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveClass('custom-class');
  });

  it('should forward additional props', () => {
    render(<Switch data-testid="my-switch" />);
    const switchElement = screen.getByTestId('my-switch');
    expect(switchElement).toBeInTheDocument();
  });

  it('should have correct background color classes', () => {
    const { rerender } = render(<Switch checked={false} />);
    const switchElement = screen.getByRole('switch');

    expect(switchElement).toHaveClass('bg-gray-200');

    rerender(<Switch checked={true} />);
    expect(switchElement).toHaveClass('bg-blue-600');
  });
});
