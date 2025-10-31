/**
 * Separator Component
 * Visual divider for separating content sections
 */

'use client';

import * as React from 'react';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
  className?: string;
}

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className = ''
}: SeparatorProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={`shrink-0 bg-gray-200 ${
        isHorizontal ? 'h-[1px] w-full' : 'h-full w-[1px]'
      } ${className}`}
    />
  );
}
