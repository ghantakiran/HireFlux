import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle text input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('should handle onChange events', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();

    render(<Input onChange={handleChange} placeholder="Enter text" />);
    await user.type(screen.getByPlaceholderText('Enter text'), 'test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeDisabled();
  });

  it('should accept different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
  });

  it('should merge custom className with default classes', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('should handle required attribute', () => {
    render(<Input required />);
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('should apply error styles when invalid', () => {
    render(<Input aria-invalid="true" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
