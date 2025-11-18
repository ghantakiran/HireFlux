/**
 * Candidate Ranking API Client (Issue #26)
 *
 * TypeScript client for AI-powered candidate ranking endpoints.
 * Calculates 0-100 fit index based on weighted factors.
 */

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

export interface RankingError {
  detail: string;
}

// ========================================================================
// API Configuration
// ========================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function handleApiError(response: Response, data: any): never {
  const error: RankingError = data;
  throw new Error(error.detail || `Request failed with status ${response.status}`);
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
      bg: "bg-green-100",
      text: "text-green-800",
      label: "Excellent fit",
    };
  } else if (fitIndex >= 60) {
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      label: "Good fit",
    };
  } else if (fitIndex >= 40) {
    return {
      bg: "bg-orange-100",
      text: "text-orange-800",
      label: "Fair fit",
    };
  } else {
    return {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "Poor fit",
    };
  }
}

/**
 * Format fit index as percentage string
 */
export function formatFitIndex(fitIndex: number): string {
  return `${fitIndex}%`;
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
 * Calculate average fit index from list
 */
export function calculateAverageFitIndex(applicants: { fit_index: number }[]): number {
  if (applicants.length === 0) return 0;
  const sum = applicants.reduce((acc, app) => acc + app.fit_index, 0);
  return Math.round(sum / applicants.length);
}

/**
 * Get weighted component contribution to total fit index
 */
export function getComponentContribution(componentScore: number, weight: number): number {
  return componentScore * weight;
}

/**
 * Validate that breakdown components sum correctly
 */
export function validateBreakdown(
  breakdown: FitIndexBreakdown,
  totalFitIndex: number
): boolean {
  const WEIGHTS = {
    skills_match: 0.30,
    experience_level: 0.20,
    location_match: 0.15,
    culture_fit: 0.15,
    salary_expectation: 0.10,
    availability: 0.10,
  };

  const calculated =
    breakdown.skills_match * WEIGHTS.skills_match +
    breakdown.experience_level * WEIGHTS.experience_level +
    breakdown.location_match * WEIGHTS.location_match +
    breakdown.culture_fit * WEIGHTS.culture_fit +
    breakdown.salary_expectation * WEIGHTS.salary_expectation +
    breakdown.availability * WEIGHTS.availability;

  // Allow 1 point rounding error
  return Math.abs(calculated - totalFitIndex) <= 1;
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
