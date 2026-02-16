/**
 * Candidate Ranking API Client (Issue #26)
 *
 * TypeScript client for AI-powered candidate ranking endpoints.
 * Calculates 0-100 fit index based on weighted factors.
 */

import { API_BASE_URL, getAuthHeaders, handleApiError } from './client';

// ========================================================================
// Types & Interfaces
// ========================================================================

export interface FitIndexBreakdown {
  skills_match: number;
  experience_level: number;
  location_match: number;
  culture_fit: number;
  salary_expectation: number;
  availability: number;
}

export interface FitIndexResponse {
  fit_index: number; // 0-100
  breakdown: FitIndexBreakdown;
  strengths: string[];
  concerns: string[];
  calculated_at: string; // ISO timestamp
  cached: boolean;
}

export interface RankedApplicant {
  application_id: string;
  candidate_user_id: string;
  candidate_name: string;
  candidate_email: string;
  fit_index: number;
  breakdown: FitIndexBreakdown;
  strengths: string[];
  concerns: string[];
  applied_at: string;
  stage: string;
}

export interface RankedApplicantListResponse {
  applicants: RankedApplicant[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  avg_fit_index: number;
}

// ========================================================================
// Ranking Functions
// ========================================================================

/**
 * Get ranked list of applicants for a job (sorted by fit index)
 * Performance requirement: <3s for 100 applicants
 */
export async function getRankedApplicants(
  jobId: string,
  options?: {
    page?: number;
    limit?: number;
    minFitIndex?: number;
    stage?: string;
  }
): Promise<RankedApplicantListResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.append("page", options.page.toString());
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.minFitIndex) params.append("min_fit", options.minFitIndex.toString());
  if (options?.stage) params.append("stage", options.stage);

  const url = `${API_BASE_URL}/api/v1/employer/jobs/${jobId}/applicants/ranked?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Calculate fit index for a specific candidate-job pair
 * Performance requirement: <2s (p95)
 */
export async function calculateFitIndex(
  applicationId: string
): Promise<FitIndexResponse> {
  const url = `${API_BASE_URL}/api/v1/employer/applicants/${applicationId}/calculate-fit`;

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Get fit index explanation for an applicant
 * Retrieves cached result or calculates if not available
 */
export async function getFitExplanation(
  applicationId: string
): Promise<FitIndexResponse> {
  const url = `${API_BASE_URL}/api/v1/employer/applicants/${applicationId}/fit-explanation`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Batch calculate fit indices for all applicants of a job
 * Runs asynchronously in background
 */
export async function batchCalculateFitIndices(
  jobId: string
): Promise<{ message: string; queued_count: number }> {
  const url = `${API_BASE_URL}/api/v1/employer/jobs/${jobId}/recalculate-all-fits`;

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

// ========================================================================
// Helper Functions
// ========================================================================

/**
 * Get color class for fit index badge
 */
export function getFitIndexColor(fitIndex: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (fitIndex >= 80) {
    return {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-300",
      label: "Excellent fit",
    };
  } else if (fitIndex >= 60) {
    return {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-300",
      label: "Good fit",
    };
  } else if (fitIndex >= 40) {
    return {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-800 dark:text-orange-300",
      label: "Fair fit",
    };
  } else {
    return {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-300",
      label: "Poor fit",
    };
  }
}

/**
 * Get human-readable label for breakdown score
 */
export function getBreakdownLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Below Average";
  return "Poor";
}

/**
 * Get breakdown weights for display
 */
export function getBreakdownWeights(): Record<keyof FitIndexBreakdown, number> {
  return {
    skills_match: 30,
    experience_level: 20,
    location_match: 15,
    culture_fit: 15,
    salary_expectation: 10,
    availability: 10,
  };
}

/**
 * Get human-readable component name
 */
export function getComponentName(component: keyof FitIndexBreakdown): string {
  const names: Record<keyof FitIndexBreakdown, string> = {
    skills_match: "Skills Match",
    experience_level: "Experience Level",
    location_match: "Location Match",
    culture_fit: "Culture Fit",
    salary_expectation: "Salary Expectation",
    availability: "Availability",
  };
  return names[component];
}
