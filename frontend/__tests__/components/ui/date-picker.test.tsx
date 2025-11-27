import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker } from '@/components/ui/date-picker';

describe('DatePicker', () => {
  it('renders and changes value', () => {
    const onChange = jest.fn();
    render(<DatePicker label="Date" onChange={onChange} />);
    const input = screen.getByLabelText('Date') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2025-11-27' } });
    expect(onChange).toHaveBeenCalledWith('2025-11-27');
  });
});


