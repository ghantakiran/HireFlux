import { render, screen } from '@testing-library/react';
import { Label } from '@/components/ui/label';

describe('Label Component', () => {
  it('should render label with text', () => {
    render(<Label>Email Address</Label>);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('should associate with input using htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>
    );

    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email');
  });

  it('should merge custom className', () => {
    render(<Label className="custom-class">Label</Label>);
    const label = screen.getByText('Label');
    expect(label).toHaveClass('custom-class');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<Label ref={ref}>Label</Label>);
    expect(ref).toHaveBeenCalled();
  });
});
