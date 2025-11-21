/**
 * TypeScript types for Applicant Filtering & Sorting
 * Issue #59: ATS Core Features
 */

export interface CandidateProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
  location: string | null;
  phone: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  fit_index: number;
  applied_at: string;
  tags: string[];
  assigned_to: string[];
  candidate: CandidateProfile;
}

export type ApplicationStatus =
  | 'new'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

export interface FilterStats {
  status_counts: Record<string, number>;
  fit_index_counts: {
    high: number;    // 80-100
    medium: number;  // 60-79
    low: number;     // 0-59
  };
  unassigned_count: number;
  total_count: number;
}

export interface ApplicantListResponse {
  applications: Application[];
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
  filter_stats: FilterStats;
}

export interface FilterParams {
  status?: string[];
  minFitIndex?: number;
  maxFitIndex?: number;
  appliedAfter?: string;
  appliedBefore?: string;
  assignedTo?: string;
  tags?: string[];
  search?: string;
  unassigned?: boolean;
  sortBy?: 'fitIndex' | 'appliedDate' | 'experience';
  order?: 'desc' | 'asc';
  page?: number;
  limit?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterParams;
  is_default?: boolean;
}

// UI State Types
export interface ApplicantFilterState {
  filters: FilterParams;
  isLoading: boolean;
  error: string | null;
  applications: Application[];
  filterStats: FilterStats | null;
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Constants
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'new',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: 'blue',
  screening: 'yellow',
  interview: 'purple',
  offer: 'green',
  hired: 'emerald',
  rejected: 'red',
};

export const SORT_OPTIONS = [
  { value: 'fitIndex', label: 'Fit Score' },
  { value: 'appliedDate', label: 'Application Date' },
  { value: 'experience', label: 'Experience' },
] as const;

export const FIT_INDEX_RANGES = [
  { label: 'High (80-100)', min: 80, max: 100, color: 'green' },
  { label: 'Medium (60-79)', min: 60, max: 79, color: 'yellow' },
  { label: 'Low (0-59)', min: 0, max: 59, color: 'red' },
] as const;
