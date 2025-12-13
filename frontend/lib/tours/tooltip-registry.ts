/**
 * Tooltip Registry
 * Central registry for all contextual tooltips in the application
 */

import { TourTooltipConfig } from './types';

// Dashboard tooltips
const dashboardTooltips: TourTooltipConfig[] = [
  {
    target: '[data-tour="stats-cards"]',
    content: 'These cards show your weekly activity at a glance. Track applications, interviews, offers, and new job matches.',
    tourId: 'dashboard',
    placement: 'bottom',
  },
  {
    target: '[data-tour="quick-actions"]',
    content: 'Refresh your dashboard data or export it for external analysis.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="recent-applications"]',
    content: 'View your latest application activities and track their status changes.',
    tourId: 'dashboard',
    placement: 'top',
  },
  {
    target: '[data-tour="job-matches"]',
    content: 'AI-powered recommendations to improve your job search strategy.',
    placement: 'top',
  },
];

// Resume builder tooltips
const resumeBuilderTooltips: TourTooltipConfig[] = [
  {
    target: '[data-tour="template-selector"]',
    content: 'Choose from ATS-optimized resume templates designed to pass applicant tracking systems.',
    tourId: 'resume-builder',
    placement: 'right',
  },
  {
    target: '[data-tour="tone-style"]',
    content: 'Select the tone that matches your industry and target company culture.',
    tourId: 'resume-builder',
    placement: 'right',
  },
  {
    target: '[data-tour="skills-section"]',
    content: 'Add your key skills. Our AI will optimize them for ATS compatibility.',
    placement: 'right',
  },
];

// Job matching tooltips
const jobMatchingTooltips: TourTooltipConfig[] = [
  {
    target: '[data-tour="fit-index"]',
    content: 'The Fit Index (0-100) shows how well you match this role based on skills, experience, and preferences.',
    learnMoreUrl: '/help/fit-index',
    placement: 'right',
  },
  {
    target: '[data-tour="job-filters"]',
    content: 'Filter jobs by remote options, visa sponsorship, salary range, and more.',
    tourId: 'job-matching',
    placement: 'bottom',
  },
  {
    target: '[data-tour="save-job"]',
    content: 'Save interesting jobs to review later. Saved jobs appear in your dashboard.',
    placement: 'left',
  },
];

// Auto-apply tooltips
const autoApplyTooltips: TourTooltipConfig[] = [
  {
    target: '[data-tour="auto-apply-toggle"]',
    content: 'Enable Auto-Apply to automatically submit applications to high-fit roles (70+ Fit Index).',
    tourId: 'auto-apply',
    learnMoreUrl: '/help/auto-apply',
    placement: 'right',
  },
  {
    target: '[data-tour="fit-threshold"]',
    content: 'Set the minimum Fit Index for auto-apply. Higher thresholds = fewer but better-matched applications.',
    placement: 'right',
  },
  {
    target: '[data-tour="credits-remaining"]',
    content: 'Each auto-apply uses 1 credit. Invalid applications are automatically refunded.',
    learnMoreUrl: '/pricing',
    placement: 'left',
  },
];

// Employer dashboard tooltips
const employerDashboardTooltips: TourTooltipConfig[] = [
  {
    target: '[data-tour="active-jobs"]',
    content: 'Manage your active job postings. View applications, edit details, or close positions.',
    tourId: 'employer-dashboard',
    placement: 'bottom',
  },
  {
    target: '[data-tour="candidate-ranking"]',
    content: 'AI-powered candidate ranking shows the best matches first based on multiple factors.',
    learnMoreUrl: '/help/employer/ranking',
    placement: 'right',
  },
  {
    target: '[data-tour="pipeline-stages"]',
    content: 'Move candidates through your hiring pipeline: Screening → Interview → Offer → Hired.',
    placement: 'bottom',
  },
];

class TooltipRegistry {
  private tooltips: Map<string, TourTooltipConfig[]> = new Map();

  constructor() {
    // Register all tooltips by page
    this.register('/dashboard', dashboardTooltips);
    this.register('/dashboard/resumes', resumeBuilderTooltips);
    this.register('/dashboard/jobs', jobMatchingTooltips);
    this.register('/dashboard/auto-apply', autoApplyTooltips);
    this.register('/employer/dashboard', employerDashboardTooltips);
  }

  /**
   * Register tooltips for a specific page
   */
  register(page: string, tooltips: TourTooltipConfig[]) {
    this.tooltips.set(page, tooltips);
  }

  /**
   * Get tooltips for a specific page
   */
  getTooltipsForPage(page: string): TourTooltipConfig[] {
    return this.tooltips.get(page) || [];
  }

  /**
   * Get tooltip by target selector
   */
  getTooltipByTarget(target: string): TourTooltipConfig | undefined {
    for (const tooltips of this.tooltips.values()) {
      const tooltip = tooltips.find((t) => t.target === target);
      if (tooltip) return tooltip;
    }
    return undefined;
  }

  /**
   * Get all tooltips
   */
  getAllTooltips(): TourTooltipConfig[] {
    const allTooltips: TourTooltipConfig[] = [];
    for (const tooltips of this.tooltips.values()) {
      allTooltips.push(...tooltips);
    }
    return allTooltips;
  }
}

export const tooltipRegistry = new TooltipRegistry();
