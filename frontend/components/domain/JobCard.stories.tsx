/**
 * JobCard Stories (Issue #94 - Option D: Storybook)
 *
 * Interactive documentation for the JobCard component
 * Showcases job listings with rich metadata and interactions
 */

import type { Meta, StoryObj } from '@storybook/react';
import { JobCard } from './JobCard';

const meta: Meta<typeof JobCard> = {
  title: 'Domain/JobCard',
  component: JobCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Job listing card displaying comprehensive job details with AI fit scoring, save/apply functionality, and rich metadata.',
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
    showFitIndex: {
      control: 'boolean',
      description: 'Show AI fit score badge',
    },
    showDescription: {
      control: 'boolean',
      description: 'Show job description',
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
type Story = StoryObj<typeof JobCard>;

// Mock job data
const mockJob = {
  id: '1',
  title: 'Senior Frontend Engineer',
  company: 'TechCorp Inc.',
  location: 'San Francisco, CA',
  locationType: 'hybrid' as const,
  salary: {
    min: 140000,
    max: 180000,
    currency: 'USD' as const,
  },
  postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  description: 'Join our innovative team to build next-generation web applications. You\'ll work on cutting-edge React/Next.js projects, collaborate with cross-functional teams, and shape the future of our platform.',
  tags: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
  fitIndex: 87,
};

// Default Story
export const Default: Story = {
  args: {
    job: mockJob,
    variant: 'full',
    showFitIndex: true,
    showDescription: true,
  },
};

// Excellent Match (High Fit Index)
export const ExcellentMatch: Story = {
  args: {
    job: {
      ...mockJob,
      fitIndex: 95,
      title: 'React Engineer',
      company: 'Dream Company',
    },
    variant: 'full',
    showFitIndex: true,
  },
};

// Moderate Match
export const ModerateMatch: Story = {
  args: {
    job: {
      ...mockJob,
      fitIndex: 65,
      title: 'Full Stack Developer',
    },
  },
};

// Remote Position
export const RemotePosition: Story = {
  args: {
    job: {
      ...mockJob,
      location: 'Remote',
      locationType: 'remote' as const,
      title: 'Remote Frontend Developer',
    },
  },
};

// On-Site Position
export const OnSitePosition: Story = {
  args: {
    job: {
      ...mockJob,
      locationType: 'onsite' as const,
      title: 'On-Site Software Engineer',
    },
  },
};

// With Many Skills
export const ManySkills: Story = {
  args: {
    job: {
      ...mockJob,
      tags: [
        'React',
        'TypeScript',
        'Next.js',
        'Tailwind CSS',
        'GraphQL',
        'Node.js',
        'PostgreSQL',
        'Docker',
        'AWS',
        'CI/CD',
      ],
    },
  },
};

// Entry Level Position
export const EntryLevel: Story = {
  args: {
    job: {
      ...mockJob,
      title: 'Junior Frontend Developer',
      salary: {
        min: 70000,
        max: 90000,
        currency: 'USD' as const,
      },
      fitIndex: 92,
      tags: ['React', 'JavaScript', 'CSS', 'Git'],
    },
  },
};

// Senior Position with High Salary
export const SeniorPosition: Story = {
  args: {
    job: {
      ...mockJob,
      title: 'Principal Engineer',
      salary: {
        min: 200000,
        max: 280000,
        currency: 'USD' as const,
      },
      tags: [
        'React',
        'System Design',
        'Architecture',
        'Leadership',
        'Mentoring',
      ],
    },
  },
};

// International Position
export const InternationalEUR: Story = {
  args: {
    job: {
      ...mockJob,
      title: 'Frontend Engineer',
      company: 'European Tech Co',
      location: 'Berlin, Germany',
      salary: {
        min: 70000,
        max: 95000,
        currency: 'EUR' as const,
      },
    },
  },
};

export const InternationalGBP: Story = {
  args: {
    job: {
      ...mockJob,
      title: 'React Developer',
      company: 'London Startup',
      location: 'London, UK',
      salary: {
        min: 60000,
        max: 80000,
        currency: 'GBP' as const,
      },
    },
  },
};

// Compact Variant
export const CompactVariant: Story = {
  args: {
    job: mockJob,
    variant: 'compact',
    showFitIndex: true,
  },
};

// Without Fit Index
export const WithoutFitIndex: Story = {
  args: {
    job: mockJob,
    showFitIndex: false,
  },
};

// Without Description
export const WithoutDescription: Story = {
  args: {
    job: mockJob,
    showDescription: false,
  },
};

// Saved Job
export const SavedJob: Story = {
  args: {
    job: {
      ...mockJob,
      saved: true,
    },
  },
};

// Interactive States
export const Interactive: Story = {
  args: {
    job: mockJob,
    onSave: (id: string) => console.log('Saved job:', id),
    onApply: (id: string) => console.log('Applied to job:', id),
    onClick: (id: string) => console.log('Clicked job:', id),
  },
};

// Loading State
export const Loading: Story = {
  args: {
    job: mockJob,
    loading: true,
  },
};

// Just Posted
export const JustPosted: Story = {
  args: {
    job: {
      ...mockJob,
      postedDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      title: 'React Developer - Just Posted!',
    },
  },
};

// Old Posting
export const OldPosting: Story = {
  args: {
    job: {
      ...mockJob,
      postedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
      title: 'Senior Engineer - Closing Soon',
    },
  },
};

// Multiple Cards Showcase
export const MultipleCards: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <JobCard
        job={{
          ...mockJob,
          id: '1',
          fitIndex: 95,
          title: 'React Engineer - Excellent Match',
        }}
        showFitIndex
      />
      <JobCard
        job={{
          ...mockJob,
          id: '2',
          fitIndex: 75,
          title: 'Full Stack Developer - Good Match',
          locationType: 'remote' as const,
          location: 'Remote',
        }}
        showFitIndex
      />
      <JobCard
        job={{
          ...mockJob,
          id: '3',
          fitIndex: 60,
          title: 'Frontend Developer - Moderate Match',
          salary: {
            min: 90000,
            max: 120000,
            currency: 'USD' as const,
          },
        }}
        showFitIndex
        variant="compact"
      />
    </div>
  ),
};
