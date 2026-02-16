/**
 * Shared Fetch API Client Utilities
 *
 * Centralizes auth headers, error handling, and API base URL
 * for all fetch-based API clients in frontend/lib/api/.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get auth headers for authenticated API requests.
 * Reads access_token from localStorage and returns Authorization + Content-Type headers.
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Handle API error response by throwing a descriptive error.
 * Extracts detail/message from response body.
 */
export function handleApiError(response: Response, data: any): never {
  const detail =
    data?.detail || data?.message || `Request failed with status ${response.status}`;
  throw new Error(detail);
}
