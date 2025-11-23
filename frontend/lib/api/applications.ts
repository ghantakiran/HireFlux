/**
 * Application API Service - Issue #58
 *
 * API client for application status management and notifications.
 * Integrates with FastAPI backend endpoints.
 */

import { ApplicationStatus } from '@/components/employer/StatusChangeModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface StatusChangeRequest {
  applicationId: string;
  newStatus: ApplicationStatus;
  sendEmail: boolean;
  customMessage?: string;
  rejectionReason?: string;
}

interface BulkStatusChangeRequest {
  applicationIds: string[];
  newStatus: ApplicationStatus;
  sendEmail: boolean;
  customMessage?: string;
  rejectionReason?: string;
}

interface StatusChangeResponse {
  success: boolean;
  application?: any;
  email_sent?: boolean;
  error?: string;
}

interface BulkStatusChangeResponse {
  success: boolean;
  success_count: number;
  failed_count: number;
  errors?: string[];
}

/**
 * Update single application status
 */
export async function updateApplicationStatus(
  data: StatusChangeRequest
): Promise<StatusChangeResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/applications/${data.applicationId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          status: data.newStatus,
          send_email: data.sendEmail,
          custom_message: data.customMessage,
          rejection_reason: data.rejectionReason,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update application status');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error updating application status:', error);
    throw error;
  }
}

/**
 * Bulk update application statuses
 */
export async function bulkUpdateApplicationStatus(
  data: BulkStatusChangeRequest
): Promise<BulkStatusChangeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/applications/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        application_ids: data.applicationIds,
        action: 'move_to_stage',
        target_status: data.newStatus,
        send_email: data.sendEmail,
        custom_message: data.customMessage,
        rejection_reason: data.rejectionReason,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update application statuses');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error bulk updating application statuses:', error);
    throw error;
  }
}

/**
 * Preview email before sending (Issue #58)
 */
export async function previewStatusChangeEmail(
  applicationId: string,
  newStatus: ApplicationStatus,
  rejectionReason?: string,
  customMessage?: string
) {
  try {
    const params = new URLSearchParams({
      new_status: newStatus,
    });

    if (rejectionReason) {
      params.append('rejection_reason', rejectionReason);
    }
    if (customMessage) {
      params.append('custom_message', customMessage);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/applications/${applicationId}/email-preview?${params}`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to preview email');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error previewing email:', error);
    throw error;
  }
}

/**
 * Get application status history
 */
export async function getApplicationStatusHistory(applicationId: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/applications/${applicationId}/status-history`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch status history');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error fetching status history:', error);
    throw error;
  }
}

/**
 * Get auth token from session/cookies
 * TODO: Replace with actual auth implementation
 */
function getAuthToken(): string {
  // This is a placeholder - replace with actual auth token retrieval
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token') || '';
  }
  return '';
}
