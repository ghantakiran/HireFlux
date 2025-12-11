/**
 * Mock Data Fixtures for E2E Tests
 * Provides realistic test data with images for comprehensive E2E testing
 */

export interface MockJob {
  id: string;
  title: string;
  company: string;
  logo_url: string;
  location: string;
  remote_policy: 'remote' | 'hybrid' | 'onsite';
  employment_type: 'full-time' | 'part-time' | 'contract';
  salary_min?: number;
  salary_max?: number;
  description: string;
  posted_at: string;
  match_score?: {
    fit_index: number;
    match_rationale: string;
    matched_skills: string[];
  };
}

export interface MockActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata: any;
}

export interface MockDashboardData {
  health_score: {
    overall_score: number;
    level: string;
    activity_score: number;
    quality_score: number;
    response_score: number;
    success_score: number;
    recommendations: string[];
    strengths: string[];
    areas_for_improvement: string[];
  };
  pipeline_stats: {
    total_applications: number;
    saved: number;
    applied: number;
    in_review: number;
    phone_screen: number;
    technical_interview: number;
    onsite_interview: number;
    final_interview: number;
    offer: number;
    rejected: number;
    withdrawn: number;
    response_rate: number;
    interview_rate: number;
    offer_rate: number;
  };
  applications_this_week: number;
  interviews_this_week: number;
  offers_pending: number;
  new_matches_count: number;
  recent_activities: MockActivity[];
  anomalies: any[];
}

/**
 * Mock job data with company logos
 */
export const mockJobs: MockJob[] = [
  {
    id: 'job-1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
    logo_url: '/images/placeholders/company-logo.svg',
    location: 'San Francisco, CA',
    remote_policy: 'remote',
    employment_type: 'full-time',
    salary_min: 150000,
    salary_max: 200000,
    description: 'Build amazing products with React and TypeScript. Work with a talented team on cutting-edge technology.',
    posted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    match_score: {
      fit_index: 92,
      match_rationale: 'Excellent match based on your React and TypeScript experience. Strong alignment with role requirements.',
      matched_skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'REST APIs'],
    },
  },
  {
    id: 'job-2',
    title: 'Full Stack Developer',
    company: 'StartupXYZ',
    logo_url: '/images/placeholders/company-logo.svg',
    location: 'New York, NY',
    remote_policy: 'hybrid',
    employment_type: 'full-time',
    salary_min: 120000,
    salary_max: 160000,
    description: 'Join our fast-growing startup and help build the next generation of SaaS products.',
    posted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    match_score: {
      fit_index: 78,
      match_rationale: 'Good match for your full-stack skills. Some gaps in backend technologies.',
      matched_skills: ['JavaScript', 'Node.js', 'PostgreSQL'],
    },
  },
  {
    id: 'job-3',
    title: 'React Native Developer',
    company: 'MobileFirst Inc',
    logo_url: '/images/placeholders/company-logo.svg',
    location: 'Austin, TX',
    remote_policy: 'remote',
    employment_type: 'contract',
    salary_min: 100000,
    salary_max: 140000,
    description: 'Build cross-platform mobile applications with React Native.',
    posted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    match_score: {
      fit_index: 65,
      match_rationale: 'Fair match. Your React skills transfer well but limited mobile experience.',
      matched_skills: ['React', 'JavaScript', 'Mobile Development'],
    },
  },
  {
    id: 'job-4',
    title: 'UI/UX Engineer',
    company: 'DesignPro',
    logo_url: '/images/placeholders/company-logo.svg',
    location: 'Los Angeles, CA',
    remote_policy: 'onsite',
    employment_type: 'full-time',
    salary_min: 110000,
    salary_max: 150000,
    description: 'Create beautiful and functional user interfaces. Strong design skills required.',
    posted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    match_score: {
      fit_index: 85,
      match_rationale: 'Strong match for your UI development skills and Tailwind CSS expertise.',
      matched_skills: ['React', 'Tailwind CSS', 'Figma', 'Design Systems'],
    },
  },
  {
    id: 'job-5',
    title: 'Engineering Manager',
    company: 'BigTech Co',
    logo_url: '/images/placeholders/company-logo.svg',
    location: 'Seattle, WA',
    remote_policy: 'hybrid',
    employment_type: 'full-time',
    salary_min: 180000,
    salary_max: 250000,
    description: 'Lead a team of 8-10 engineers building scalable web applications.',
    posted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    match_score: {
      fit_index: 70,
      match_rationale: 'Good technical fit but limited management experience indicated in profile.',
      matched_skills: ['Leadership', 'React', 'Team Building'],
    },
  },
];

/**
 * Mock activity data
 */
export const mockActivities: MockActivity[] = [
  {
    id: 'activity-1',
    type: 'application_submitted',
    title: 'Applied to Senior Frontend Engineer',
    description: 'Successfully submitted application to TechCorp',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { job_id: 'job-1', company: 'TechCorp' },
  },
  {
    id: 'activity-2',
    type: 'interview_scheduled',
    title: 'Interview scheduled with StartupXYZ',
    description: 'Phone screen scheduled for tomorrow at 2 PM',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { job_id: 'job-2', interview_type: 'phone_screen' },
  },
  {
    id: 'activity-3',
    type: 'job_saved',
    title: 'Saved Engineering Manager position',
    description: 'Bookmarked job at BigTech Co for later review',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { job_id: 'job-5' },
  },
  {
    id: 'activity-4',
    type: 'resume_updated',
    title: 'Updated resume',
    description: 'Added new skills and projects to resume',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { resume_id: 'resume-1' },
  },
  {
    id: 'activity-5',
    type: 'application_viewed',
    title: 'Application viewed by MobileFirst Inc',
    description: 'Your application for React Native Developer was reviewed',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { job_id: 'job-3', company: 'MobileFirst Inc' },
  },
];

/**
 * Mock dashboard data
 */
export const mockDashboardData: MockDashboardData = {
  health_score: {
    overall_score: 78,
    level: 'good',
    activity_score: 82,
    quality_score: 76,
    response_score: 72,
    success_score: 80,
    recommendations: [
      'Increase application volume to 5-7 per week for better results',
      'Focus on roles with 80+ fit index for higher success rate',
      'Update your resume with recent projects to improve match quality',
    ],
    strengths: [
      'High-quality applications with strong fit scores',
      'Consistent interview preparation and follow-up',
      'Well-optimized resume for ATS systems',
    ],
    areas_for_improvement: [
      'Low application volume (only 3 this week)',
      'Response rate could be higher with more follow-ups',
      'Consider expanding job search criteria',
    ],
  },
  pipeline_stats: {
    total_applications: 28,
    saved: 12,
    applied: 28,
    in_review: 8,
    phone_screen: 5,
    technical_interview: 3,
    onsite_interview: 2,
    final_interview: 1,
    offer: 1,
    rejected: 6,
    withdrawn: 2,
    response_rate: 42.8,
    interview_rate: 35.7,
    offer_rate: 3.6,
  },
  applications_this_week: 3,
  interviews_this_week: 2,
  offers_pending: 1,
  new_matches_count: 15,
  recent_activities: mockActivities,
  anomalies: [],
};

/**
 * Get mock jobs with optional filters
 */
export function getMockJobs(filters?: {
  query?: string;
  remote_policy?: string;
  min_fit_index?: number;
  limit?: number;
}): MockJob[] {
  let jobs = [...mockJobs];

  if (filters?.query) {
    const query = filters.query.toLowerCase();
    jobs = jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query)
    );
  }

  if (filters?.remote_policy && filters.remote_policy !== 'any') {
    jobs = jobs.filter((job) => job.remote_policy === filters.remote_policy);
  }

  if (filters?.min_fit_index !== undefined) {
    const minFit = filters.min_fit_index;
    jobs = jobs.filter(
      (job) => (job.match_score?.fit_index || 0) >= minFit
    );
  }

  if (filters?.limit) {
    jobs = jobs.slice(0, filters.limit);
  }

  return jobs;
}

/**
 * Get mock dashboard data
 */
export function getMockDashboardData(): MockDashboardData {
  return mockDashboardData;
}

/**
 * Get mock activities
 */
export function getMockActivities(limit?: number): MockActivity[] {
  return limit ? mockActivities.slice(0, limit) : mockActivities;
}
