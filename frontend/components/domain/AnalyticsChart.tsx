/**
 * AnalyticsChart Component (Issue #94)
 *
 * Simple analytics and metrics visualization component with bar/line/area charts
 * Uses CSS-based rendering for lightweight performance without external charting libraries
 * Used across dashboards for displaying application trends, job views, credit usage, etc.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/domain/EmptyState';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface AnalyticsChartProps {
  /** Chart data points */
  data: ChartDataPoint[];
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** Chart type */
  type?: 'bar' | 'line' | 'area';
  /** Color theme */
  color?: 'primary' | 'success' | 'error' | 'accent';
  /** Chart height in pixels */
  height?: number;
  /** Whether to show values on bars/points */
  showValues?: boolean;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Whether to show total statistic */
  showTotal?: boolean;
  /** Whether to show average statistic */
  showAverage?: boolean;
  /** Whether to show peak statistic */
  showPeak?: boolean;
  /** Whether to show data table alternative */
  showDataTable?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Visual variant */
  variant?: 'default' | 'card';
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color classes based on theme
 */
function getColorClasses(color: AnalyticsChartProps['color']): {
  bg: string;
  border: string;
  text: string;
} {
  switch (color) {
    case 'success':
      return {
        bg: 'bg-success-500',
        border: 'border-success-500',
        text: 'text-success-500',
      };
    case 'error':
      return {
        bg: 'bg-error',
        border: 'border-error',
        text: 'text-error',
      };
    case 'accent':
      return {
        bg: 'bg-accent-500',
        border: 'border-accent-500',
        text: 'text-accent-500',
      };
    case 'primary':
    default:
      return {
        bg: 'bg-primary',
        border: 'border-primary',
        text: 'text-primary',
      };
  }
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/**
 * Calculate statistics
 */
function calculateStats(data: ChartDataPoint[]) {
  const values = data.map((d) => d.value);
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = data.length > 0 ? total / data.length : 0;
  const peak = Math.max(...values, 0);

  return { total, average, peak };
}

export function AnalyticsChart({
  data,
  title,
  description,
  type = 'bar',
  color = 'primary',
  height = 200,
  showValues = false,
  showTooltip = false,
  showTotal = false,
  showAverage = false,
  showPeak = false,
  showDataTable = false,
  emptyMessage = 'No data available',
  variant = 'default',
  loading = false,
  className,
}: AnalyticsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const colors = getColorClasses(color);
  const stats = calculateStats(data);
  const maxValue = Math.max(...data.map((d) => d.value), 1); // Avoid division by zero

  // Empty state
  if (data.length === 0 && !loading) {
    return (
      <div
        data-analytics-chart
        data-variant={variant}
        className={cn(
          'w-full',
          variant === 'card' && 'rounded-lg border border-border bg-card p-4 shadow-sm',
          className
        )}
      >
        <EmptyState title={emptyMessage} variant="compact" showIcon={false} />
      </div>
    );
  }

  // Container classes
  const containerClasses = cn(
    'w-full',
    variant === 'card' && 'rounded-lg border border-border bg-card p-4 shadow-sm',
    className
  );

  return (
    <div data-analytics-chart data-variant={variant} className={containerClasses}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Summary Statistics */}
      {(showTotal || showAverage || showPeak) && (
        <div className="mb-4 flex flex-wrap gap-4">
          {showTotal && (
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold text-foreground">{formatNumber(stats.total)}</span>
            </div>
          )}
          {showAverage && (
            <div className="text-sm">
              <span className="text-muted-foreground">Average: </span>
              <span className="font-semibold text-foreground">{formatNumber(stats.average)}</span>
            </div>
          )}
          {showPeak && (
            <div className="text-sm">
              <span className="text-muted-foreground">Peak: </span>
              <span className="font-semibold text-foreground">{formatNumber(stats.peak)}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          role="status"
          aria-label="Loading"
          data-skeleton
          className="w-full rounded-md bg-muted animate-pulse"
          style={{ height: `${height}px` }}
        />
      )}

      {/* Chart */}
      {!loading && (
        <TooltipProvider>
          <div
            data-chart
            data-chart-type={type}
            role="img"
            aria-label={`${title || 'Analytics'} chart showing ${data.length} data points`}
            className="w-full relative"
            style={{ height: `${height}px` }}
          >
            {/* Bar Chart */}
            {type === 'bar' && (
              <div className="flex items-end justify-around h-full gap-1 px-2">
                {data.map((point, index) => {
                  const heightPercent = (point.value / maxValue) * 100;

                  const barElement = (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                      {/* Value Label */}
                      {showValues && (
                        <span data-value-label className="text-xs text-muted-foreground">
                          {formatNumber(point.value)}
                        </span>
                      )}

                      {/* Bar */}
                      <div
                        data-chart-bar
                        data-value={point.value}
                        className={cn(
                          'w-full rounded-t transition-all hover:opacity-80 cursor-pointer',
                          colors.bg
                        )}
                        style={{ height: `${heightPercent}%` }}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />

                      {/* Label */}
                      <span className="text-xs text-muted-foreground truncate w-full text-center">
                        {point.label}
                      </span>
                    </div>
                  );

                  if (showTooltip) {
                    return (
                      <Tooltip key={index} open={hoveredIndex === index}>
                        <TooltipTrigger asChild>{barElement}</TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-semibold">{point.label}</p>
                            <p>{formatNumber(point.value)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return barElement;
                })}
              </div>
            )}

            {/* Line/Area Chart (Simplified) */}
            {(type === 'line' || type === 'area') && (
              <div className="h-full flex items-end relative">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  {/* Build path */}
                  <path
                    d={data
                      .map((point, index) => {
                        const x = (index / (data.length - 1 || 1)) * 100;
                        const y = 100 - (point.value / maxValue) * 100;
                        return `${index === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                      })
                      .join(' ')}
                    fill={type === 'area' ? `hsl(var(--${color}))` : 'none'}
                    fillOpacity={type === 'area' ? 0.2 : 0}
                    stroke={`hsl(var(--${color}))`}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {/* Labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around px-2 pb-2">
                  {data.map((point, index) => (
                    <span key={index} className="text-xs text-muted-foreground">
                      {point.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* Data Table Alternative */}
      {showDataTable && !loading && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Label</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="py-2 px-3">{point.label}</td>
                  <td className="text-right py-2 px-3 font-medium">{formatNumber(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
