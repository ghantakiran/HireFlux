/**
 * Tour Registry
 * Central registry for all onboarding tours
 */

import { TourConfig } from './types';

// Dashboard Tour (Job Seeker)
const dashboardTour: TourConfig = {
  id: 'dashboard',
  name: 'Dashboard Overview',
  description: 'Learn how to navigate your job search dashboard',
  autoStart: true,
  showWelcomeModal: true,
  welcomeTitle: 'Welcome to HireFlux!',
  welcomeContent:
    "Let's take a quick tour of your dashboard. You'll learn how to track applications, discover jobs, and manage your career journey.",
  priority: 10,
  roles: ['job_seeker'],
  pages: ['/dashboard'],
  steps: [
    {
      id: 'dashboard-1',
      target: '#dashboard-content',
      title: 'Your Dashboard',
      content:
        'This is your command center for job searching. See your stats, recent applications, and quick actions all in one place.',
      placement: 'center',
    },
    {
      id: 'dashboard-2',
      target: '[data-tour="stats-cards"]',
      title: 'Track Your Progress',
      content:
        'Monitor your active applications, interview count, and job matches. These cards update in real-time as you apply.',
      placement: 'bottom',
    },
    {
      id: 'dashboard-3',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      content:
        'Access your most common tasks instantly: create a resume, search jobs, or enable auto-apply.',
      placement: 'bottom',
    },
    {
      id: 'dashboard-4',
      target: '[data-tour="recent-applications"]',
      title: 'Recent Applications',
      content:
        'Track the status of your job applications. Click any application to see details, notes, and next steps.',
      placement: 'top',
    },
    {
      id: 'dashboard-5',
      target: '[data-tour="job-matches"]',
      title: 'AI Job Matches',
      content:
        'Our AI finds jobs that match your skills and preferences. The Fit Index shows how well each job matches your profile.',
      placement: 'top',
    },
  ],
};

// Resume Builder Tour
const resumeBuilderTour: TourConfig = {
  id: 'resume-builder',
  name: 'Resume Builder',
  description: 'Create ATS-optimized resumes in minutes',
  autoStart: true,
  showWelcomeModal: true,
  welcomeTitle: 'Build Your Perfect Resume',
  welcomeContent:
    'Our AI-powered resume builder helps you create professional, ATS-optimized resumes tailored to each job.',
  priority: 9,
  roles: ['job_seeker'],
  pages: ['/dashboard/resumes/new', '/dashboard/resumes/builder'],
  steps: [
    {
      id: 'resume-1',
      target: '[data-tour="template-selector"]',
      title: 'Choose a Template',
      content:
        'Select from professional templates optimized for different industries. All templates are ATS-friendly.',
      placement: 'right',
    },
    {
      id: 'resume-2',
      target: '[data-tour="personal-info"]',
      title: 'Personal Information',
      content: 'Start with your contact details. You can save multiple versions for different job types.',
      placement: 'right',
    },
    {
      id: 'resume-3',
      target: '[data-tour="experience-section"]',
      title: 'Work Experience',
      content:
        'Add your work history. Use the AI assistant to generate bullet points that highlight your achievements.',
      placement: 'right',
      actionLabel: 'Try AI Assistant',
    },
    {
      id: 'resume-4',
      target: '[data-tour="skills-section"]',
      title: 'Skills & Keywords',
      content:
        'Add relevant skills. Our AI suggests keywords from job descriptions to improve your ATS score.',
      placement: 'right',
    },
    {
      id: 'resume-5',
      target: '[data-tour="tone-selector"]',
      title: 'Customize Tone',
      content: 'Choose between Formal, Concise, or Conversational tone to match the company culture.',
      placement: 'left',
    },
    {
      id: 'resume-6',
      target: '[data-tour="preview-download"]',
      title: 'Preview & Download',
      content: 'Preview your resume in real-time and download as PDF when ready.',
      placement: 'left',
    },
    {
      id: 'resume-7',
      target: '[data-tour="version-control"]',
      title: 'Save Multiple Versions',
      content:
        'Create different resume versions for different job types. HireFlux automatically selects the best version when applying.',
      placement: 'bottom',
    },
  ],
};

// Job Matching Tour
const jobMatchingTour: TourConfig = {
  id: 'job-matching',
  name: 'Job Matching',
  description: 'Discover how our AI finds your perfect job matches',
  autoStart: true,
  priority: 8,
  roles: ['job_seeker'],
  pages: ['/dashboard/jobs'],
  steps: [
    {
      id: 'job-matching-1',
      target: '[data-tour="job-list"]',
      title: 'Your Job Matches',
      content:
        'Jobs are ranked by Fit Index (0-100) based on your skills, experience, and preferences.',
      placement: 'center',
    },
    {
      id: 'job-matching-2',
      target: '[data-tour="fit-index"]',
      title: 'Understanding Fit Index',
      content:
        'The Fit Index shows how well a job matches your profile. Scores above 70 are excellent matches!',
      placement: 'right',
    },
    {
      id: 'job-matching-3',
      target: '[data-tour="filter-jobs"]',
      title: 'Filter Your Matches',
      content: 'Narrow down jobs by remote work, salary range, visa sponsorship, and more.',
      placement: 'left',
    },
    {
      id: 'job-matching-4',
      target: '[data-tour="save-job"]',
      title: 'Save for Later',
      content: 'Bookmark jobs you like. Saved jobs appear in your dashboard for quick access.',
      placement: 'bottom',
    },
    {
      id: 'job-matching-5',
      target: '[data-tour="apply-button"]',
      title: 'Quick Apply',
      content:
        'Apply with one click using your saved resume. Enable Auto-Apply to apply automatically to top matches.',
      placement: 'bottom',
    },
    {
      id: 'job-matching-6',
      target: '[data-tour="job-alerts"]',
      title: 'Set Up Job Alerts',
      content:
        'Get notified when new high-fit jobs are posted. Customize alert frequency and criteria.',
      placement: 'top',
    },
  ],
};

// Auto-Apply Setup Tour
const autoApplyTour: TourConfig = {
  id: 'auto-apply',
  name: 'Auto-Apply Setup',
  description: 'Set up automatic job applications',
  autoStart: false,
  priority: 7,
  roles: ['job_seeker'],
  pages: ['/dashboard/auto-apply'],
  steps: [
    {
      id: 'auto-apply-1',
      target: '[data-tour="auto-apply-toggle"]',
      title: 'Enable Auto-Apply',
      content:
        'Turn on Auto-Apply to automatically submit applications to jobs with a Fit Index above your threshold.',
      placement: 'center',
    },
    {
      id: 'auto-apply-2',
      target: '[data-tour="fit-threshold"]',
      title: 'Set Fit Threshold',
      content:
        'Only apply to jobs with a Fit Index above this threshold (recommended: 70+). This ensures quality over quantity.',
      placement: 'bottom',
    },
    {
      id: 'auto-apply-3',
      target: '[data-tour="preferences"]',
      title: 'Customize Preferences',
      content:
        'Set filters for remote work, salary range, location, and company size. Auto-Apply respects these preferences.',
      placement: 'bottom',
    },
    {
      id: 'auto-apply-4',
      target: '[data-tour="credit-usage"]',
      title: 'Credit System',
      content:
        'Each application uses 1 credit. Get refunds for invalid jobs or rejections within 24 hours.',
      placement: 'top',
    },
  ],
};

// Employer Dashboard Tour
const employerDashboardTour: TourConfig = {
  id: 'employer-dashboard',
  name: 'Employer Dashboard',
  description: 'Manage your hiring pipeline',
  autoStart: true,
  showWelcomeModal: true,
  welcomeTitle: 'Welcome to Your Hiring Command Center',
  welcomeContent:
    "Let's explore how to post jobs, review candidates, and manage your hiring pipeline efficiently.",
  priority: 10,
  roles: ['employer'],
  pages: ['/employer/dashboard'],
  steps: [
    {
      id: 'employer-dashboard-1',
      target: '#employer-dashboard-content',
      title: 'Your Hiring Overview',
      content: 'Track active jobs, new applications, and hiring metrics all in one place.',
      placement: 'center',
    },
    {
      id: 'employer-dashboard-2',
      target: '[data-tour="active-jobs"]',
      title: 'Active Job Postings',
      content:
        'View and manage your active job postings. Click any job to see applicants and analytics.',
      placement: 'bottom',
    },
    {
      id: 'employer-dashboard-3',
      target: '[data-tour="new-applications"]',
      title: 'New Applications',
      content:
        'Review new applicants as they arrive. AI ranks candidates by Fit Index to save you time.',
      placement: 'bottom',
    },
    {
      id: 'employer-dashboard-4',
      target: '[data-tour="pipeline-stats"]',
      title: 'Pipeline Metrics',
      content:
        'Monitor your hiring funnel: applications, screenings, interviews, and offers.',
      placement: 'top',
    },
    {
      id: 'employer-dashboard-5',
      target: '[data-tour="post-job-button"]',
      title: 'Post a New Job',
      content:
        'Create job postings with AI assistance. Our AI generates complete job descriptions from minimal input.',
      placement: 'bottom',
    },
    {
      id: 'employer-dashboard-6',
      target: '[data-tour="team-activity"]',
      title: 'Team Collaboration',
      content: 'See recent team activity: reviews, notes, and status updates on candidates.',
      placement: 'top',
    },
  ],
};

// Cover Letter Generator Tour
const coverLetterTour: TourConfig = {
  id: 'cover-letter',
  name: 'Cover Letter Generator',
  description: 'Create personalized cover letters',
  autoStart: true,
  priority: 6,
  roles: ['job_seeker'],
  pages: ['/dashboard/cover-letters/new'],
  steps: [
    {
      id: 'cover-letter-1',
      target: '[data-tour="job-selection"]',
      title: 'Select the Job',
      content: 'Choose the job you're applying for. We'll tailor your cover letter to the role.',
      placement: 'right',
    },
    {
      id: 'cover-letter-2',
      target: '[data-tour="tone-style"]',
      title: 'Choose Your Tone',
      content: 'Select Formal, Concise, or Conversational tone to match the company culture.',
      placement: 'right',
    },
    {
      id: 'cover-letter-3',
      target: '[data-tour="key-points"]',
      title: 'Highlight Key Achievements',
      content:
        'Add 2-3 key achievements that are relevant to the job. AI will weave them into your letter.',
      placement: 'right',
    },
    {
      id: 'cover-letter-4',
      target: '[data-tour="generate-button"]',
      title: 'Generate Cover Letter',
      content:
        'Click to generate a personalized cover letter. Takes about 5 seconds with AI magic!',
      placement: 'bottom',
      actionLabel: 'Generate Now',
    },
    {
      id: 'cover-letter-5',
      target: '[data-tour="edit-preview"]',
      title: 'Edit & Refine',
      content:
        'Review the generated letter. You can edit any section or regenerate specific paragraphs.',
      placement: 'left',
    },
    {
      id: 'cover-letter-6',
      target: '[data-tour="save-download"]',
      title: 'Save & Download',
      content: 'Save your cover letter and download as PDF or DOCX.',
      placement: 'bottom',
    },
  ],
};

class TourRegistry {
  private tours: Map<string, TourConfig> = new Map();

  constructor() {
    // Register all tours
    this.registerTour(dashboardTour);
    this.registerTour(resumeBuilderTour);
    this.registerTour(jobMatchingTour);
    this.registerTour(autoApplyTour);
    this.registerTour(employerDashboardTour);
    this.registerTour(coverLetterTour);
  }

  registerTour(tour: TourConfig) {
    this.tours.set(tour.id, tour);
  }

  getTourById(id: string): TourConfig | undefined {
    return this.tours.get(id);
  }

  getToursByPage(page: string): TourConfig[] {
    return Array.from(this.tours.values()).filter(
      (tour) => !tour.pages || tour.pages.some((p) => page.startsWith(p))
    );
  }

  getToursByRole(role: string): TourConfig[] {
    return Array.from(this.tours.values()).filter(
      (tour) => !tour.roles || tour.roles.includes(role)
    );
  }

  getAllTours(): TourConfig[] {
    return Array.from(this.tours.values()).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
}

export const tourRegistry = new TourRegistry();
