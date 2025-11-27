/**
 * AISuggestionCard Stories (Issue #94 - Option D: Storybook)
 *
 * Interactive documentation for the AISuggestionCard component
 * Showcases AI recommendations with confidence scores and reasoning
 */

import type { Meta, StoryObj } from '@storybook/react';
import { AISuggestionCard } from './AISuggestionCard';

const meta: Meta<typeof AISuggestionCard> = {
  title: 'Domain/AISuggestionCard',
  component: AISuggestionCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Displays AI-generated suggestions with confidence scores, reasoning, and accept/reject workflow. Central to HireFlux\'s AI-first approach.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['full', 'compact'],
      description: 'Display variant',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state',
    },
    accepted: {
      control: 'boolean',
      description: 'Suggestion accepted state',
    },
    rejected: {
      control: 'boolean',
      description: 'Suggestion rejected state',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AISuggestionCard>;

// Mock suggestion data
const mockSuggestion = {
  id: '1',
  type: 'skill' as const,
  title: 'Add TypeScript to your resume',
  description: 'Your recent projects show strong TypeScript usage, but it\'s not prominently featured in your skills section.',
  reasoning: 'Based on analysis of your GitHub contributions and project descriptions, TypeScript appears in 85% of your recent work. Adding this to your skills section could increase match rates by ~15% for frontend positions.',
  confidence: 0.92,
  impact: 'high' as const,
};

// Default Story
export const Default: Story = {
  args: {
    suggestion: mockSuggestion,
    variant: 'full',
  },
};

// High Confidence
export const HighConfidence: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      confidence: 0.95,
      title: 'Highlight your leadership experience',
      description: 'Your work history includes team lead roles, but they\'re buried in job descriptions.',
      reasoning: 'Analysis shows you managed teams of 5-8 engineers at both current and previous roles. Highlighting this explicitly could improve matches for senior positions by 25%.',
    },
  },
};

// Medium Confidence
export const MediumConfidence: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      confidence: 0.68,
      title: 'Consider adding cloud certifications',
      description: 'Many matching jobs prefer AWS or Azure certifications.',
      reasoning: 'While your experience shows cloud platform usage, formal certifications could strengthen applications. 40% of target jobs list certifications as preferred qualifications.',
      impact: 'medium' as const,
    },
  },
};

// Low Confidence
export const LowConfidence: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      confidence: 0.45,
      title: 'Expand your remote work experience',
      description: 'Remote positions often prefer candidates with proven remote experience.',
      reasoning: 'Your resume mentions "hybrid work" but doesn\'t detail remote collaboration tools or async communication skills. This is a weak signal based on limited data.',
      impact: 'low' as const,
    },
  },
};

// Different Suggestion Types
export const SkillSuggestion: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      type: 'skill' as const,
      title: 'Add GraphQL to skills',
    },
  },
};

export const ExperienceSuggestion: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      type: 'experience' as const,
      title: 'Quantify your impact at TechCorp',
      description: 'Add metrics to demonstrate the scope of your work.',
      reasoning: 'Job descriptions with quantifiable achievements receive 40% more interviews. Your TechCorp role lacks specific metrics about team size, user impact, or performance improvements.',
    },
  },
};

export const EducationSuggestion: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      type: 'education' as const,
      title: 'Add relevant coursework',
      description: 'List advanced CS courses that align with target roles.',
      reasoning: 'For candidates with <3 years experience, relevant coursework can strengthen applications. Your degree included advanced algorithms and distributed systems courses.',
    },
  },
};

export const ProfileSuggestion: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      type: 'profile' as const,
      title: 'Update your professional summary',
      description: 'Emphasize full-stack capabilities and leadership.',
      reasoning: 'Your current summary focuses solely on frontend work, but your experience shows strong backend and mentoring skills. A more balanced summary could expand job matches by 20%.',
      impact: 'high' as const,
    },
  },
};

// Impact Levels
export const HighImpact: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      impact: 'high' as const,
      title: 'Critical: Add required certifications',
      description: 'Many target roles require specific certifications you have.',
    },
  },
};

export const MediumImpact: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      impact: 'medium' as const,
      title: 'Improve resume formatting',
      description: 'ATS systems may struggle with your current format.',
    },
  },
};

export const LowImpact: Story = {
  args: {
    suggestion: {
      ...mockSuggestion,
      impact: 'low' as const,
      title: 'Minor: Update contact information',
      description: 'LinkedIn URL format could be simplified.',
    },
  },
};

// Interactive States
export const Accepted: Story = {
  args: {
    suggestion: mockSuggestion,
    accepted: true,
  },
};

export const Rejected: Story = {
  args: {
    suggestion: mockSuggestion,
    rejected: true,
  },
};

export const Loading: Story = {
  args: {
    suggestion: mockSuggestion,
    loading: true,
  },
};

// Compact Variant
export const CompactVariant: Story = {
  args: {
    suggestion: mockSuggestion,
    variant: 'compact',
  },
};

// With Callbacks
export const Interactive: Story = {
  args: {
    suggestion: mockSuggestion,
    onAccept: (id: string) => console.log('Accepted suggestion:', id),
    onReject: (id: string) => console.log('Rejected suggestion:', id),
    onUndo: (id: string) => console.log('Undone suggestion:', id),
  },
};

// Multiple Suggestions
export const MultipleSuggestions: Story = {
  render: () => (
    <div className="space-y-4">
      <AISuggestionCard
        suggestion={{
          id: '1',
          type: 'skill' as const,
          title: 'Add TypeScript to skills',
          description: 'TypeScript appears in 85% of your projects.',
          reasoning: 'Strong evidence from GitHub analysis.',
          confidence: 0.95,
          impact: 'high' as const,
        }}
      />
      <AISuggestionCard
        suggestion={{
          id: '2',
          type: 'experience' as const,
          title: 'Quantify achievements',
          description: 'Add metrics to your most recent role.',
          reasoning: 'Quantified achievements increase interview rates by 40%.',
          confidence: 0.82,
          impact: 'high' as const,
        }}
        variant="compact"
      />
      <AISuggestionCard
        suggestion={{
          id: '3',
          type: 'profile' as const,
          title: 'Update professional summary',
          description: 'Highlight leadership and mentoring.',
          reasoning: 'Moderate confidence based on job descriptions.',
          confidence: 0.65,
          impact: 'medium' as const,
        }}
        variant="compact"
      />
    </div>
  ),
};
