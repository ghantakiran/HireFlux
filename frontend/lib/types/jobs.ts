/**
 * Job Type Definitions
 * Central type definitions for job-related data
 */

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  tags: string[];
  fitIndex: number; // 0-100
  logo?: string;
  description: string;
  requirements: string[];
  postedAt: string; // ISO 8601 date
  remote?: boolean;
  visaSponsorship?: boolean;
}

export interface JobFilters {
  remote?: boolean;
  visaSponsorship?: boolean;
  salaryMin?: number;
  location?: string;
  type?: Job['type'];
}

export interface SavedJob {
  id: string;
  jobId: string;
  savedAt: string;
  notes?: string;
}
