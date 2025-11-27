/**
 * AnalyticsChart Component Tests (Issue #94)
 *
 * TDD/BDD approach for analytics and metrics visualization component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsChart } from '@/components/domain/AnalyticsChart';

const mockData = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 19 },
  { label: 'Wed', value: 15 },
  { label: 'Thu', value: 25 },
  { label: 'Fri', value: 22 },
  { label: 'Sat', value: 8 },
  { label: 'Sun', value: 6 },
];

describe('AnalyticsChart', () => {
  describe('Basic Rendering', () => {
    it('should render chart title', () => {
      render(<AnalyticsChart data={mockData} title="Weekly Applications" />);
      expect(screen.getByText('Weekly Applications')).toBeInTheDocument();
    });

    it('should render chart description when provided', () => {
      render(<AnalyticsChart data={mockData} description="Applications per day" />);
      expect(screen.getByText('Applications per day')).toBeInTheDocument();
    });

    it('should render data labels', () => {
      render(<AnalyticsChart data={mockData} />);
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
    });

    it('should render all data points', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars.length).toBe(mockData.length);
    });
  });

  describe('Chart Types', () => {
    it('should render bar chart', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveAttribute('data-chart-type', 'bar');
    });

    it('should render line chart', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="line" />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveAttribute('data-chart-type', 'line');
    });

    it('should render area chart', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="area" />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveAttribute('data-chart-type', 'area');
    });
  });

  describe('Value Display', () => {
    it('should show values on hover when showValues is true', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" showValues />);
      const valueLabels = container.querySelectorAll('[data-value-label]');
      expect(valueLabels.length).toBeGreaterThan(0);
    });

    it('should hide values when showValues is false', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" showValues={false} />);
      const valueLabels = container.querySelectorAll('[data-value-label]');
      expect(valueLabels.length).toBe(0);
    });

    it('should format large values with commas', () => {
      const largeData = [{ label: 'Jan', value: 1500 }];
      render(<AnalyticsChart data={largeData} type="bar" showValues />);
      expect(screen.getByText(/1,500/)).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('should show total when showTotal is true', () => {
      render(<AnalyticsChart data={mockData} showTotal />);
      // Sum: 12+19+15+25+22+8+6 = 107
      expect(screen.getByText(/107/)).toBeInTheDocument();
    });

    it('should show average when showAverage is true', () => {
      render(<AnalyticsChart data={mockData} showAverage />);
      // Average: 107/7 ≈ 15.3
      expect(screen.getByText(/15\.3/)).toBeInTheDocument();
    });

    it('should show peak value when showPeak is true', () => {
      render(<AnalyticsChart data={mockData} showPeak />);
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    it('should show all stats when all flags are true', () => {
      render(<AnalyticsChart data={mockData} showTotal showAverage showPeak />);
      expect(screen.getByText(/total/i)).toBeInTheDocument();
      expect(screen.getByText(/average/i)).toBeInTheDocument();
      expect(screen.getByText(/peak/i)).toBeInTheDocument();
    });
  });

  describe('Color Themes', () => {
    it('should apply primary color theme', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" color="primary" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars[0]).toHaveClass('bg-primary');
    });

    it('should apply success color theme', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" color="success" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars[0]).toHaveClass('bg-success-500');
    });

    it('should apply error color theme', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" color="error" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars[0]).toHaveClass('bg-error');
    });

    it('should apply accent color theme', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" color="accent" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars[0]).toHaveClass('bg-accent-500');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no data', () => {
      render(<AnalyticsChart data={[]} />);
      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });

    it('should show custom empty message when provided', () => {
      render(<AnalyticsChart data={[]} emptyMessage="No analytics available" />);
      expect(screen.getByText('No analytics available')).toBeInTheDocument();
    });

    it('should not render chart elements when empty', () => {
      const { container } = render(<AnalyticsChart data={[]} />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars.length).toBe(0);
    });
  });

  describe('Height and Sizing', () => {
    it('should apply custom height', () => {
      const { container } = render(<AnalyticsChart data={mockData} height={300} />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveStyle({ height: '300px' });
    });

    it('should use default height when not specified', () => {
      const { container } = render(<AnalyticsChart data={mockData} />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveStyle({ height: '200px' });
    });

    it('should scale bars proportionally to max value', () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      const maxBar = Array.from(bars).find((bar) =>
        bar.getAttribute('data-value') === '25'
      );
      expect(maxBar).toHaveStyle({ height: '100%' });
    });
  });

  describe('Tooltip/Hover Functionality', () => {
    it('should show tooltip on hover when showTooltip is true', async () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" showTooltip />);
      const firstBar = container.querySelector('[data-chart-bar]');

      if (firstBar) {
        await userEvent.hover(firstBar);
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      }
    });

    it('should display value in tooltip', async () => {
      const { container } = render(<AnalyticsChart data={mockData} type="bar" showTooltip />);
      const firstBar = container.querySelector('[data-chart-bar]');

      if (firstBar) {
        await userEvent.hover(firstBar);
        expect(screen.getByText(/12/)).toBeInTheDocument();
      }
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive and fill container width', () => {
      const { container } = render(<AnalyticsChart data={mockData} />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveClass('w-full');
    });

    it('should adjust bar spacing based on data points', () => {
      const fewData = [{ label: 'A', value: 10 }, { label: 'B', value: 20 }];
      const { container } = render(<AnalyticsChart data={fewData} type="bar" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars.length).toBe(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for chart container', () => {
      const { container } = render(<AnalyticsChart data={mockData} title="Analytics" />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveAttribute('role', 'img');
    });

    it('should have aria-label describing the chart', () => {
      const { container } = render(<AnalyticsChart data={mockData} title="Weekly Stats" />);
      const chart = container.querySelector('[data-chart]');
      expect(chart).toHaveAttribute('aria-label');
      expect(chart?.getAttribute('aria-label')).toContain('Weekly Stats');
    });

    it('should have proper heading level', () => {
      render(<AnalyticsChart data={mockData} title="Analytics" />);
      const heading = screen.getByRole('heading', { name: 'Analytics' });
      expect(heading).toBeInTheDocument();
    });

    it('should provide data table alternative', () => {
      render(<AnalyticsChart data={mockData} showDataTable />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const singleData = [{ label: 'A', value: 100 }];
      render(<AnalyticsChart data={singleData} type="bar" />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      const zeroData = [{ label: 'A', value: 0 }, { label: 'B', value: 10 }];
      render(<AnalyticsChart data={zeroData} type="bar" showValues />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      const negativeData = [{ label: 'A', value: -5 }, { label: 'B', value: 10 }];
      render(<AnalyticsChart data={negativeData} type="bar" />);
      // Should render but handle gracefully
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      const largeData = [{ label: 'A', value: 1000000 }];
      render(<AnalyticsChart data={largeData} type="bar" showValues />);
      expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
    });

    it('should handle many data points', () => {
      const manyData = Array.from({ length: 50 }, (_, i) => ({
        label: `D${i + 1}`,
        value: Math.random() * 100,
      }));
      const { container } = render(<AnalyticsChart data={manyData} type="bar" />);
      const bars = container.querySelectorAll('[data-chart-bar]');
      expect(bars.length).toBe(50);
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading prop is true', () => {
      render(<AnalyticsChart data={mockData} loading />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should show skeleton when loading', () => {
      const { container } = render(<AnalyticsChart data={mockData} loading />);
      const skeleton = container.querySelector('[data-skeleton]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(<AnalyticsChart data={mockData} variant="default" />);
      const chart = container.querySelector('[data-analytics-chart]');
      expect(chart).toHaveAttribute('data-variant', 'default');
    });

    it('should render card variant', () => {
      const { container } = render(<AnalyticsChart data={mockData} variant="card" />);
      const chart = container.querySelector('[data-analytics-chart]');
      expect(chart).toHaveAttribute('data-variant', 'card');
    });
  });
});
