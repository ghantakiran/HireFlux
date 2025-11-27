/**
 * FitIndexBadge Stories (Issue #94 - Option D: Storybook)
 *
 * Interactive documentation for the FitIndexBadge component
 * Showcases all variants, sizes, and score ranges
 */

import type { Meta, StoryObj } from '@storybook/react';
import { FitIndexBadge } from './FitIndexBadge';

const meta: Meta<typeof FitIndexBadge> = {
  title: 'Domain/FitIndexBadge',
  component: FitIndexBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Displays AI fit scores (0-100) with color-coded ranges. Used across JobCard and ApplicationPipeline components.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Fit score from 0-100',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size variant',
    },
    showLabel: {
      control: 'boolean',
      description: 'Show "Fit Index" label',
    },
    variant: {
      control: 'select',
      options: ['job-seeker', 'employer'],
      description: 'Display variant for different user types',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FitIndexBadge>;

// Default Story
export const Default: Story = {
  args: {
    score: 87,
    size: 'md',
    showLabel: true,
    variant: 'job-seeker',
  },
};

// Score Ranges
export const ExcellentMatch: Story = {
  args: {
    score: 95,
    size: 'md',
    showLabel: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Score >= 90: Excellent match (dark green)',
      },
    },
  },
};

export const GoodMatch: Story = {
  args: {
    score: 82,
    size: 'md',
    showLabel: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Score 75-89: Good match (green)',
      },
    },
  },
};

export const ModerateMatch: Story = {
  args: {
    score: 68,
    size: 'md',
    showLabel: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Score 60-74: Moderate match (amber)',
      },
    },
  },
};

export const FairMatch: Story = {
  args: {
    score: 52,
    size: 'md',
    showLabel: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Score 40-59: Fair match (orange)',
      },
    },
  },
};

export const PoorMatch: Story = {
  args: {
    score: 28,
    size: 'md',
    showLabel: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Score < 40: Poor match (red)',
      },
    },
  },
};

// Size Variants
export const SmallSize: Story = {
  args: {
    score: 87,
    size: 'sm',
    showLabel: true,
  },
};

export const MediumSize: Story = {
  args: {
    score: 87,
    size: 'md',
    showLabel: true,
  },
};

export const LargeSize: Story = {
  args: {
    score: 87,
    size: 'lg',
    showLabel: true,
  },
};

// Label Options
export const WithoutLabel: Story = {
  args: {
    score: 87,
    size: 'md',
    showLabel: false,
  },
};

export const WithLabel: Story = {
  args: {
    score: 87,
    size: 'md',
    showLabel: true,
  },
};

// Variants
export const JobSeekerVariant: Story = {
  args: {
    score: 87,
    size: 'md',
    showLabel: true,
    variant: 'job-seeker',
  },
  parameters: {
    docs: {
      description: {
        story: 'Variant optimized for job seeker view',
      },
    },
  },
};

export const EmployerVariant: Story = {
  args: {
    score: 87,
    size: 'md',
    showLabel: true,
    variant: 'employer',
  },
  parameters: {
    docs: {
      description: {
        story: 'Variant optimized for employer view',
      },
    },
  },
};

// Edge Cases
export const MinimumScore: Story = {
  args: {
    score: 0,
    size: 'md',
    showLabel: true,
  },
};

export const MaximumScore: Story = {
  args: {
    score: 100,
    size: 'md',
    showLabel: true,
  },
};

// Multiple Badges
export const MultipleScores: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-24">Excellent:</span>
        <FitIndexBadge score={95} size="md" showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-24">Good:</span>
        <FitIndexBadge score={80} size="md" showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-24">Moderate:</span>
        <FitIndexBadge score={65} size="md" showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-24">Fair:</span>
        <FitIndexBadge score={50} size="md" showLabel />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-24">Poor:</span>
        <FitIndexBadge score={30} size="md" showLabel />
      </div>
    </div>
  ),
};
