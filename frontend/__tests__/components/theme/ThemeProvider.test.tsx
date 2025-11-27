import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

describe('ThemeProvider + ThemeToggle', () => {
  it('toggles dark class on html element', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );
    const btn = screen.getByRole('button', { name: /toggle dark mode/i });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});


