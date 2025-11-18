/**
 * Job Posting API Client (Issue #23)
 *
 * TypeScript client for Job CRUD and AI-assisted creation endpoints.
 */

// ========================================================================
// Types & Interfaces
// ========================================================================

export enum JobStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  CLOSED = "closed",
}

export enum LocationType {
  REMOTE = "remote",
  HYBRID = "hybrid",
  ONSITE = "onsite",
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
  INTERNSHIP = "internship",
}

export enum ExperienceLevel {
  ENTRY = "entry",
  MID = "mid",
  SENIOR = "senior",
  LEAD = "lead",
  EXECUTIVE = "executive",
}

export interface Job {
  id: string;
  company_id: string | null;
  title: string;
  company: string;
  department: string | null;
  location: string;
  location_type: string;
  employment_type: string;
  experience_level: string | null;
  experience_min_years: number | null;
  experience_max_years: number | null;
  experience_requirement: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  required_skills: string[];
  preferred_skills: string[];
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  source: string | null;
  external_id: string | null;
  external_url: string | null;
  requires_visa_sponsorship: boolean;
  is_active: boolean;
  posted_date: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Analytics/metrics fields
  applications_count?: number;
  views_count?: number;
  avg_fit_index?: number;
}

export interface JobCreateRequest {
  title: string;
  company_name: string;
  department?: string;
  location: string;
  location_type: LocationType;
  employment_type: EmploymentType;
  experience_level?: ExperienceLevel;
  experience_min_years?: number;
  experience_max_years?: number;
  experience_requirement?: string;
  salary_min?: number;
  salary_max?: number;
  description: string;
  required_skills?: string[];
  preferred_skills?: string[];
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  requires_visa_sponsorship?: boolean;
  external_url?: string;
  expires_at?: string;
}

export interface JobUpdateRequest {
  title?: string;
  department?: string;
  location?: string;
  location_type?: LocationType;
  employment_type?: EmploymentType;
  experience_level?: ExperienceLevel;
  experience_min_years?: number;
  experience_max_years?: number;
  experience_requirement?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  requires_visa_sponsorship?: boolean;
  external_url?: string;
  expires_at?: string;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface JobListFilters {
  status?: string;
  page?: number;
  limit?: number;
}

// AI Assistance Types
export interface JobAIGenerationRequest {
  title: string;
  key_points: string[];
  experience_level?: ExperienceLevel;
  location?: string;
  employment_type?: EmploymentType;
  department?: string;
}

export interface JobAIGenerationResponse {
  description: string;
  requirements: string[];
  responsibilities: string[];
  suggested_skills: string[];
  token_usage: number;
  cost: number;
  generation_time_ms: number;
}

export interface JobSkillsSuggestionRequest {
  title: string;
  description?: string;
  existing_skills?: string[];
}

export interface JobSkillsSuggestionResponse {
  suggested_skills: string[];
  technical_skills: string[];
  soft_skills: string[];
}

export interface JobSalarySuggestionRequest {
  title: string;
  experience_level: ExperienceLevel;
  location: string;
}

export interface JobSalarySuggestionResponse {
  salary_min: number;
  salary_max: number;
  currency: string;
  market_data?: {
    market_median?: number;
    percentile_25?: number;
    percentile_75?: number;
    location_adjustment?: number;
    notes?: string;
  };
}

export interface JobError {
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
  const error: JobError = data;
  throw new Error(error.detail || `Request failed with status ${response.status}`);
}

// ========================================================================
// Job CRUD Functions
// ========================================================================

/**
 * Create a new job posting
 */
export async function createJob(jobData: JobCreateRequest): Promise<Job> {
  const url = `${API_BASE_URL}/api/v1/jobs`;

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobData),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * List all jobs with optional filters
 */
export async function listJobs(
  filters?: JobListFilters
): Promise<JobListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());

  const url = `${API_BASE_URL}/api/v1/jobs?${params.toString()}`;

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
 * Get a single job by ID
 */
export async function getJob(jobId: string): Promise<Job> {
  const url = `${API_BASE_URL}/api/v1/jobs/${jobId}`;

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
 * Update an existing job
 */
export async function updateJob(
  jobId: string,
  updates: JobUpdateRequest
): Promise<Job> {
  const url = `${API_BASE_URL}/api/v1/jobs/${jobId}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus
): Promise<Job> {
  const url = `${API_BASE_URL}/api/v1/jobs/${jobId}/status`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Delete a job (soft delete)
 */
export async function deleteJob(jobId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/jobs/${jobId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    handleApiError(response, data);
  }
}

/**
 * Check if company can post more jobs
 */
export async function checkCanPostJob(): Promise<{
  can_post: boolean;
  message: string;
}> {
  const url = `${API_BASE_URL}/api/v1/jobs/check/can-post`;

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

// ========================================================================
// AI Assistance Functions
// ========================================================================

/**
 * Generate job description with AI from title + key points
 * Performance requirement: <6s (p95)
 */
export async function generateJobDescription(
  request: JobAIGenerationRequest
): Promise<JobAIGenerationResponse> {
  const url = `${API_BASE_URL}/api/v1/jobs/generate-description`;

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Suggest relevant skills for job posting with AI
 * Performance requirement: <3s
 */
export async function suggestSkills(
  request: JobSkillsSuggestionRequest
): Promise<JobSkillsSuggestionResponse> {
  const url = `${API_BASE_URL}/api/v1/jobs/suggest-skills`;

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Suggest salary range with AI based on role, level, and location
 * Performance requirement: <2s
 */
export async function suggestSalaryRange(
  request: JobSalarySuggestionRequest
): Promise<JobSalarySuggestionResponse> {
  const url = `${API_BASE_URL}/api/v1/jobs/suggest-salary`;

  const response = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
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
 * Format salary range as string
 */
export function formatSalaryRange(
  min?: number | null,
  max?: number | null
): string {
  if (!min && !max) return "Not specified";
  if (min && !max) return `$${min.toLocaleString()}+`;
  if (!min && max) return `Up to $${max.toLocaleString()}`;
  return `$${min!.toLocaleString()} - $${max!.toLocaleString()}`;
}

/**
 * Get Tailwind color class for job status badge
 */
export function getStatusBadgeColor(status: JobStatus | string): string {
  const colors: Record<string, string> = {
    [JobStatus.DRAFT]: "bg-gray-100 text-gray-800",
    [JobStatus.ACTIVE]: "bg-green-100 text-green-800",
    [JobStatus.PAUSED]: "bg-yellow-100 text-yellow-800",
    [JobStatus.CLOSED]: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * Get human-readable label for location type
 */
export function getLocationTypeLabel(locationType: LocationType | string): string {
  const labels: Record<string, string> = {
    [LocationType.REMOTE]: "Remote",
    [LocationType.HYBRID]: "Hybrid",
    [LocationType.ONSITE]: "On-site",
  };
  return labels[locationType] || locationType;
}

/**
 * Get human-readable label for employment type
 */
export function getEmploymentTypeLabel(
  employmentType: EmploymentType | string
): string {
  const labels: Record<string, string> = {
    [EmploymentType.FULL_TIME]: "Full-time",
    [EmploymentType.PART_TIME]: "Part-time",
    [EmploymentType.CONTRACT]: "Contract",
    [EmploymentType.INTERNSHIP]: "Internship",
  };
  return labels[employmentType] || employmentType;
}

/**
 * Get human-readable label for experience level
 */
export function getExperienceLevelLabel(
  experienceLevel: ExperienceLevel | string
): string {
  const labels: Record<string, string> = {
    [ExperienceLevel.ENTRY]: "Entry Level",
    [ExperienceLevel.MID]: "Mid Level",
    [ExperienceLevel.SENIOR]: "Senior",
    [ExperienceLevel.LEAD]: "Lead",
    [ExperienceLevel.EXECUTIVE]: "Executive",
  };
  return labels[experienceLevel] || experienceLevel;
}

/**
 * Get status label
 */
export function getStatusLabel(status: JobStatus | string): string {
  const labels: Record<string, string> = {
    [JobStatus.DRAFT]: "Draft",
    [JobStatus.ACTIVE]: "Active",
    [JobStatus.PAUSED]: "Paused",
    [JobStatus.CLOSED]: "Closed",
  };
  return labels[status] || status;
}

/**
 * Validate job creation data
 */
export function validateJobData(data: Partial<JobCreateRequest>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.title || data.title.trim() === "") {
    errors.push("Job title is required");
  }

  if (!data.company_name || data.company_name.trim() === "") {
    errors.push("Company name is required");
  }

  if (!data.location || data.location.trim() === "") {
    errors.push("Location is required");
  }

  if (!data.location_type) {
    errors.push("Location type is required");
  }

  if (!data.employment_type) {
    errors.push("Employment type is required");
  }

  if (!data.description || data.description.trim() === "") {
    errors.push("Job description is required");
  }

  if (
    data.salary_min !== undefined &&
    data.salary_max !== undefined &&
    data.salary_min > data.salary_max
  ) {
    errors.push("Maximum salary must be greater than minimum salary");
  }

  if (
    data.experience_min_years !== undefined &&
    data.experience_max_years !== undefined &&
    data.experience_min_years > data.experience_max_years
  ) {
    errors.push("Maximum experience must be greater than minimum experience");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get experience level options for select
 */
export function getExperienceLevelOptions(): Array<{
  value: ExperienceLevel;
  label: string;
}> {
  return [
    { value: ExperienceLevel.ENTRY, label: "Entry Level" },
    { value: ExperienceLevel.MID, label: "Mid Level" },
    { value: ExperienceLevel.SENIOR, label: "Senior" },
    { value: ExperienceLevel.LEAD, label: "Lead" },
    { value: ExperienceLevel.EXECUTIVE, label: "Executive" },
  ];
}

/**
 * Get location type options for select
 */
export function getLocationTypeOptions(): Array<{
  value: LocationType;
  label: string;
}> {
  return [
    { value: LocationType.REMOTE, label: "Remote" },
    { value: LocationType.HYBRID, label: "Hybrid" },
    { value: LocationType.ONSITE, label: "On-site" },
  ];
}

/**
 * Get employment type options for select
 */
export function getEmploymentTypeOptions(): Array<{
  value: EmploymentType;
  label: string;
}> {
  return [
    { value: EmploymentType.FULL_TIME, label: "Full-time" },
    { value: EmploymentType.PART_TIME, label: "Part-time" },
    { value: EmploymentType.CONTRACT, label: "Contract" },
    { value: EmploymentType.INTERNSHIP, label: "Internship" },
  ];
}
