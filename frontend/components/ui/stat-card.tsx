'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  subtitle?: React.ReactNode;
  layout?: 'icon-top' | 'icon-right' | 'minimal';
  className?: string;
  'data-testid'?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'blue',
  valueColor,
  subtitle,
  layout = 'icon-top',
  className,
  'data-testid': dataTestId,
}: StatCardProps) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
  };

  const colors = colorMap[iconColor] || colorMap.blue;
  const valueClassName = valueColor
    ? `text-2xl font-bold ${valueColor}`
    : 'text-2xl font-bold text-gray-900 dark:text-gray-100';

  if (layout === 'icon-right') {
    return (
      <div
        className={cn('bg-gray-50 dark:bg-gray-800 p-4 rounded-lg', className)}
        data-testid={dataTestId}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <p className={cn(valueClassName, 'mt-1')}>{value}</p>
          </div>
          {Icon && <Icon className={cn('w-8 h-8', colors.text)} />}
        </div>
      </div>
    );
  }

  if (layout === 'minimal') {
    return (
      <div className={className} data-testid={dataTestId}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
        <p className={cn('text-3xl font-bold', valueColor || 'text-gray-900 dark:text-gray-100')}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    );
  }

  // Default: icon-top
  return (
    <div
      className={cn('bg-gray-50 dark:bg-gray-800 p-4 rounded-lg', className)}
      data-testid={dataTestId}
    >
      {Icon && (
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-2', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className={valueClassName}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
