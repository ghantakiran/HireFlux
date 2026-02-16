/**
 * Job Templates API Client (Issue #24)
 *
 * Client-side functions for job template operations:
 * - List templates with filters
 * - Get template by ID
 * - Create new template
 * - Update template
 * - Delete template
 * - Create job from template
 *
 * TypeScript types and helper utilities included.
 */

import { API_BASE_URL, getAuthHeaders, handleApiError } from './client';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export enum TemplateVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum TemplateCategory {
  ENGINEERING = 'engineering',
  PRODUCT = 'product',
  DESIGN = 'design',
  SALES = 'sales',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  CUSTOMER_SUCCESS = 'customer_success',
  HR = 'hr',
  FINANCE = 'finance',
  DATA = 'data',
  OTHER = 'other',
}

export interface JobTemplate {
  id: string;
  company_id: string | null; // null for public templates
  name: string;
  category: TemplateCategory;
  visibility: TemplateVisibility;
  title: string;
  department?: string;
  employment_type?: string;
  experience_level?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobTemplateListResponse {
  templates: JobTemplate[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateJobTemplateRequest {
  name: string;
  category: TemplateCategory;
  visibility?: TemplateVisibility;
  title: string;
  department?: string;
  employment_type?: string;
  experience_level?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
}

export interface UpdateJobTemplateRequest {
  name?: string;
  category?: TemplateCategory;
  visibility?: TemplateVisibility;
  title?: string;
  department?: string;
  employment_type?: string;
  experience_level?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
}

export interface ListTemplatesFilters {
  visibility?: TemplateVisibility;
  category?: TemplateCategory;
  page?: number;
  page_size?: number;
}

export interface CreateJobFromTemplateResponse {
  success: boolean;
  message: string;
  template_id: string;
  template_data: {
    title: string;
    department?: string;
    employment_type?: string;
    experience_level?: string;
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
    skills?: string[];
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List job templates with optional filters
 */
export async function listJobTemplates(
  filters?: ListTemplatesFilters
): Promise<JobTemplateListResponse> {
  // Build query params
  const params = new URLSearchParams();
  if (filters?.visibility) params.append('visibility', filters.visibility);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.page_size) params.append('page_size', filters.page_size.toString());

  const url = `${API_BASE_URL}/api/v1/employer/job-templates?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Get a specific job template by ID
 */
export async function getJobTemplate(templateId: string): Promise<JobTemplate> {
  const url = `${API_BASE_URL}/api/v1/employer/job-templates/${templateId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Create a new job template
 */
export async function createJobTemplate(
  templateData: CreateJobTemplateRequest
): Promise<JobTemplate> {
  const url = `${API_BASE_URL}/api/v1/employer/job-templates`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(templateData),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Update an existing job template
 */
export async function updateJobTemplate(
  templateId: string,
  templateData: UpdateJobTemplateRequest
): Promise<JobTemplate> {
  const url = `${API_BASE_URL}/api/v1/employer/job-templates/${templateId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(templateData),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

/**
 * Delete a job template
 */
export async function deleteJobTemplate(templateId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/employer/job-templates/${templateId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    handleApiError(response, data);
  }

  // 204 No Content - success
}

/**
 * Create job from template
 * Returns template data that can be used to pre-fill job creation form
 */
export async function createJobFromTemplate(
  templateId: string
): Promise<CreateJobFromTemplateResponse> {
  const url = `${API_BASE_URL}/api/v1/employer/job-templates/jobs/from-template/${templateId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    handleApiError(response, data);
  }

  return data;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable category label
 */
export function getCategoryLabel(category: TemplateCategory): string {
  const labels: Record<TemplateCategory, string> = {
    [TemplateCategory.ENGINEERING]: 'Engineering',
    [TemplateCategory.PRODUCT]: 'Product',
    [TemplateCategory.DESIGN]: 'Design',
    [TemplateCategory.SALES]: 'Sales',
    [TemplateCategory.MARKETING]: 'Marketing',
    [TemplateCategory.OPERATIONS]: 'Operations',
    [TemplateCategory.CUSTOMER_SUCCESS]: 'Customer Success',
    [TemplateCategory.HR]: 'HR',
    [TemplateCategory.FINANCE]: 'Finance',
    [TemplateCategory.DATA]: 'Data',
    [TemplateCategory.OTHER]: 'Other',
  };
  return labels[category];
}

/**
 * Get category color (for badges/tags)
 */
export function getCategoryColor(category: TemplateCategory): string {
  const colors: Record<TemplateCategory, string> = {
    [TemplateCategory.ENGINEERING]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    [TemplateCategory.PRODUCT]: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    [TemplateCategory.DESIGN]: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    [TemplateCategory.SALES]: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    [TemplateCategory.MARKETING]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    [TemplateCategory.OPERATIONS]: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    [TemplateCategory.CUSTOMER_SUCCESS]: 'bg-teal-100 text-teal-800',
    [TemplateCategory.HR]: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    [TemplateCategory.FINANCE]: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    [TemplateCategory.DATA]: 'bg-cyan-100 text-cyan-800',
    [TemplateCategory.OTHER]: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  };
  return colors[category];
}

/**
 * Check if template belongs to current company
 */
function isCompanyTemplate(template: JobTemplate, companyId: string): boolean {
  return template.company_id === companyId;
}

/**
 * Check if template can be edited (company templates only)
 */
export function canEditTemplate(template: JobTemplate, companyId: string): boolean {
  return isCompanyTemplate(template, companyId);
}

/**
 * Check if template can be deleted (company templates only)
 */
export function canDeleteTemplate(template: JobTemplate, companyId: string): boolean {
  return isCompanyTemplate(template, companyId);
}

/**
 * Format usage count for display
 */
export function formatUsageCount(count: number): string {
  if (count === 0) return 'Not used yet';
  if (count === 1) return 'Used 1 time';
  return `Used ${count} times`;
}

/**
 * Get visibility label
 */
export function getVisibilityLabel(visibility: TemplateVisibility): string {
  return visibility === TemplateVisibility.PUBLIC ? 'Public' : 'Private';
}

/**
 * Get all category options for dropdowns
 */
export function getCategoryOptions(): Array<{ value: TemplateCategory; label: string }> {
  return Object.values(TemplateCategory).map((category) => ({
    value: category,
    label: getCategoryLabel(category),
  }));
}

