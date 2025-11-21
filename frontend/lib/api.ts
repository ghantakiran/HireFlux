import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// API Client Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('access_token', data.data.access_token);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// Authentication API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => apiClient.post<ApiResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse>('/auth/login', data),

  logout: () => apiClient.post<ApiResponse>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    apiClient.post<ApiResponse>('/auth/refresh', { refresh_token: refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<ApiResponse>('/auth/reset-password', { token, new_password: newPassword }),
};

// User API
export const userApi = {
  getMe: () => apiClient.get<ApiResponse>('/users/me'),

  updateProfile: (data: Partial<any>) => apiClient.patch<ApiResponse>('/users/me', data),

  completeOnboarding: (data: {
    target_titles: string[];
    salary_min: number;
    salary_max: number;
    industries: string[];
    locations: string[];
    skills: string[];
  }) => apiClient.post<ApiResponse>('/users/me/onboarding', data),
};

// Resume API
export const resumeApi = {
  getResumes: () => apiClient.get<ApiResponse>('/resumes'),

  getResume: (id: string) => apiClient.get<ApiResponse>(`/resumes/${id}`),

  createResume: (data: {
    title: string;
    target_role: string;
    tone?: string;
    content?: any;
  }) => apiClient.post<ApiResponse>('/resumes', data),

  updateResume: (id: string, data: Partial<any>) =>
    apiClient.patch<ApiResponse>(`/resumes/${id}`, data),

  deleteResume: (id: string) => apiClient.delete<ApiResponse>(`/resumes/${id}`),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse>('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  generate: (data: {
    resume_id: string;
    target_title: string;
    tone: string;
    version_name: string;
  }) => apiClient.post<ApiResponse>('/resumes/generate', data),

  getVersions: () => apiClient.get<ApiResponse>('/resumes/versions'),

  getVersion: (id: string) => apiClient.get<ApiResponse>(`/resumes/versions/${id}`),

  exportVersion: (id: string, format: 'pdf' | 'docx', template: string) =>
    apiClient.post<ApiResponse>(`/resumes/versions/${id}/export`, { format, template }),

  deleteVersion: (id: string) => apiClient.delete<ApiResponse>(`/resumes/versions/${id}`),

  getRecommendations: (id: string) => apiClient.get<ApiResponse>(`/resumes/${id}/recommendations`),

  createVersion: (id: string, data: { name: string }) =>
    apiClient.post<ApiResponse>(`/resumes/${id}/versions`, data),

  tailorToJob: (id: string, data: { job_description: string }) =>
    apiClient.post<ApiResponse>(`/resumes/${id}/tailor`, data),

  regenerateSection: (id: string, data: { section: string }) =>
    apiClient.post<ApiResponse>(`/resumes/${id}/regenerate-section`, data),
};

// Cover Letter API
export const coverLetterApi = {
  generate: (data: {
    job_id?: string;
    job_description: string;
    resume_version_id: string;
    tone: string;
    length: string;
    personalize_company: boolean;
  }) => apiClient.post<ApiResponse>('/cover-letters/generate', data),

  getAll: (params?: { page?: number; limit?: number; job_id?: string }) =>
    apiClient.get<ApiResponse>('/cover-letters', { params }),

  getById: (id: string) => apiClient.get<ApiResponse>(`/cover-letters/${id}`),

  delete: (id: string) => apiClient.delete<ApiResponse>(`/cover-letters/${id}`),
};

// Job API
export const jobApi = {
  getMatches: (params?: {
    min_fit_index?: number;
    remote_policy?: string;
    visa_friendly?: boolean;
    salary_min?: number;
    salary_max?: number;
    posted_after?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }) => apiClient.get<ApiResponse>('/jobs/matches', { params }),

  getById: (id: string) => apiClient.get<ApiResponse>(`/jobs/${id}`),

  saveJob: (id: string) => apiClient.post<ApiResponse>(`/jobs/${id}/save`),

  search: (data: {
    query: string;
    filters?: any;
    sort?: string;
    limit?: number;
  }) => apiClient.post<ApiResponse>('/jobs/search', data),
};

// Application API
export const applicationApi = {
  create: (data: {
    job_id: string;
    resume_version_id: string;
    cover_letter_id?: string;
    answers?: any;
  }) => apiClient.post<ApiResponse>('/applications', data),

  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse>('/applications', { params }),

  getById: (id: string) => apiClient.get<ApiResponse>(`/applications/${id}`),

  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch<ApiResponse>(`/applications/${id}`, data),

  getAnalytics: () => apiClient.get<ApiResponse>('/applications/analytics'),
};

// Billing & Subscription API
export const billingApi = {
  // Subscription endpoints
  createCheckoutSession: (data: {
    plan: 'plus' | 'pro';
    billing_interval: 'monthly' | 'yearly';
    success_url: string;
    cancel_url: string;
    promo_code?: string;
  }) => apiClient.post<ApiResponse>('/billing/subscriptions/create', data),

  getCurrentSubscription: () => apiClient.get<ApiResponse>('/billing/subscriptions/current'),

  cancelSubscription: (data: {
    immediate: boolean;
    reason?: string;
  }) => apiClient.post<ApiResponse>('/billing/subscriptions/cancel', data),

  createBillingPortalSession: (data: {
    return_url: string;
  }) => apiClient.post<ApiResponse>('/billing/portal', data),

  // Credits endpoints
  getCredits: () => apiClient.get<ApiResponse>('/billing/credits'),

  getCreditHistory: (params?: {
    credit_type?: string;
    limit?: number;
  }) => apiClient.get<ApiResponse>('/billing/credits/history', { params }),

  checkCredits: (creditType: string, amount: number) =>
    apiClient.get<ApiResponse>(`/billing/credits/check/${creditType}/${amount}`),

  purchaseCredits: (data: {
    amount: number;
    success_url: string;
    cancel_url: string;
  }) => apiClient.post<ApiResponse>('/billing/credits/purchase', data),

  // Usage limits endpoints (Issue #64)
  getUsageLimits: () => apiClient.get<ApiResponse>('/billing/usage-limits'),

  checkUsageLimit: (resource: 'jobs' | 'candidate_views' | 'team_members') =>
    apiClient.post<ApiResponse>('/billing/usage-limits/check', { resource }),

  getUpgradeRecommendation: () =>
    apiClient.get<ApiResponse>('/billing/usage-limits/upgrade-recommendation'),
};

// Notification API
export const notificationApi = {
  getAll: (params?: {
    unread_only?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get<ApiResponse>('/notifications', { params }),

  markAsRead: (id: string) => apiClient.patch<ApiResponse>(`/notifications/${id}/read`),

  markAllAsRead: () => apiClient.post<ApiResponse>('/notifications/mark-all-read'),
};

// Analytics API
export const analyticsApi = {
  getDashboardOverview: () => apiClient.get<ApiResponse>('/analytics/dashboard'),

  getDetailedAnalytics: (timeRange?: string) =>
    apiClient.get<ApiResponse>('/analytics/dashboard/detailed', {
      params: { time_range: timeRange },
    }),

  getPipelineStats: (timeRange?: string) =>
    apiClient.get<ApiResponse>('/analytics/pipeline/stats', {
      params: { time_range: timeRange },
    }),

  getPipelineDistribution: (timeRange?: string) =>
    apiClient.get<ApiResponse>('/analytics/pipeline/distribution', {
      params: { time_range: timeRange },
    }),

  getConversionFunnel: (timeRange?: string) =>
    apiClient.get<ApiResponse>('/analytics/pipeline/funnel', {
      params: { time_range: timeRange },
    }),

  getSuccessMetrics: (timeRange?: string) =>
    apiClient.get<ApiResponse>('/analytics/metrics/success', {
      params: { time_range: timeRange },
    }),

  getHealthScore: () => apiClient.get<ApiResponse>('/analytics/health-score'),

  getActivityTimeline: (params?: { skip?: number; limit?: number; activity_types?: string[] }) =>
    apiClient.get<ApiResponse>('/analytics/activity', { params }),

  getApplicationTrends: (timeRange?: string) =>
    apiClient.get<ApiResponse>('/analytics/trends/applications', {
      params: { time_range: timeRange },
    }),

  getTimeSeriesChart: (metric: string, timeRange?: string) =>
    apiClient.get<ApiResponse>(`/analytics/trends/timeseries/${metric}`, {
      params: { time_range: timeRange },
    }),

  getAnomalies: () => apiClient.get<ApiResponse>('/analytics/anomalies'),

  getPeerComparison: () => apiClient.get<ApiResponse>('/analytics/benchmarks/peer-comparison'),

  getQuickStats: () => apiClient.get<ApiResponse>('/analytics/quick-stats'),

  exportDashboardData: (timeRange?: string) =>
    apiClient.get<ApiResponse>('/analytics/export', {
      params: { time_range: timeRange },
    }),
};

// Employer API
export const employerApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    industry?: string;
    size?: string;
    location?: string;
    website?: string;
  }) => apiClient.post<ApiResponse>('/employers/register', data),

  getCompany: () => apiClient.get<ApiResponse>('/employers/me'),

  updateCompany: (data: Partial<{
    name: string;
    industry: string;
    size: string;
    location: string;
    website: string;
    logo_url: string;
    description: string;
  }>) => apiClient.put<ApiResponse>('/employers/me', data),

  getTeamMembers: () => apiClient.get<ApiResponse>('/employers/me/members'),

  inviteTeamMember: (data: {
    email: string;
    role: string;
    permissions?: any;
  }) => apiClient.post<ApiResponse>('/employers/me/members', data),

  removeTeamMember: (memberId: string) =>
    apiClient.delete<ApiResponse>(`/employers/me/members/${memberId}`),
};

// ATS (Applicant Tracking System) API
export const atsApi = {
  // Application listing with filtering and sorting
  getJobApplications: (
    jobId: string,
    params?: {
      status?: string;
      min_fit_index?: number;
      sort_by?: string;
      order?: string;
      page?: number;
      limit?: number;
    }
  ) => apiClient.get<ApiResponse>(`/ats/jobs/${jobId}/applications`, { params }),

  // AI candidate ranking
  getRankedApplications: (jobId: string) =>
    apiClient.get<ApiResponse>(`/ats/jobs/${jobId}/applications/ranked`),

  // Status management
  updateApplicationStatus: (
    applicationId: string,
    data: {
      status: string;
      note?: string;
    }
  ) => apiClient.patch<ApiResponse>(`/ats/applications/${applicationId}/status`, data),

  // Notes and collaboration
  addApplicationNote: (
    applicationId: string,
    data: {
      content: string;
      visibility: 'team' | 'private';
    }
  ) => apiClient.post<ApiResponse>(`/ats/applications/${applicationId}/notes`, data),

  getApplicationNotes: (applicationId: string) =>
    apiClient.get<ApiResponse>(`/ats/applications/${applicationId}/notes`),

  // Reviewer assignment
  assignReviewers: (
    applicationId: string,
    data: {
      assigned_to: string[];
    }
  ) => apiClient.patch<ApiResponse>(`/ats/applications/${applicationId}/assign`, data),

  // Bulk operations
  bulkUpdateApplications: (data: {
    application_ids: string[];
    action: 'reject' | 'shortlist' | 'move_to_stage';
    target_status?: string;
  }) => apiClient.post<ApiResponse>(`/ats/applications/bulk-update`, data),

  // Fit score calculation
  calculateFit: (applicationId: string) =>
    apiClient.post<ApiResponse>(`/ats/applications/${applicationId}/calculate-fit`),
};

// Candidate Profile API (Job Seeker Profile Management)
export const candidateProfileApi = {
  // Create candidate profile
  create: (data: {
    headline: string;
    bio?: string;
    location?: string;
    skills?: string[];
    years_experience?: number;
    experience_level?: string;
    min_salary?: number;
    max_salary?: number;
    preferred_location_type?: string;
    open_to_remote?: boolean;
    availability_status?: string;
    visibility?: string;
    profile_picture_url?: string;
    preferred_roles?: string[];
  }) => apiClient.post<ApiResponse>('/candidate-profiles', data),

  // Get own profile
  getMyProfile: () => apiClient.get<ApiResponse>('/candidate-profiles/me'),

  // Update profile
  update: (data: Partial<{
    headline: string;
    bio: string;
    location: string;
    skills: string[];
    years_experience: number;
    experience_level: string;
    min_salary: number;
    max_salary: number;
    preferred_location_type: string;
    open_to_remote: boolean;
    profile_picture_url: string;
    preferred_roles: string[];
  }>) => apiClient.patch<ApiResponse>('/candidate-profiles/me', data),

  // Set visibility (public/private)
  setVisibility: (visibility: 'public' | 'private') =>
    apiClient.put<ApiResponse>(`/candidate-profiles/me/visibility?visibility=${visibility}`),

  // Update availability
  updateAvailability: (data: {
    availability_status: 'actively_looking' | 'open_to_offers' | 'not_looking';
    available_from?: string;
  }) => apiClient.put<ApiResponse>('/candidate-profiles/me/availability', data),

  // Portfolio management
  addPortfolioItem: (data: {
    type: 'github' | 'website' | 'article' | 'project';
    title: string;
    description?: string;
    url: string;
  }) => apiClient.post<ApiResponse>('/candidate-profiles/me/portfolio', data),

  removePortfolioItem: (itemIndex: number) =>
    apiClient.delete<ApiResponse>(`/candidate-profiles/me/portfolio/${itemIndex}`),

  // Delete profile
  delete: () => apiClient.delete<ApiResponse>('/candidate-profiles/me'),
};

// Candidate Search API (Employer Candidate Discovery)
export const candidateSearchApi = {
  // Search candidates with filters
  search: (data: {
    skills?: string[];
    experience_level?: string[];
    min_years_experience?: number;
    max_years_experience?: number;
    location?: string;
    remote_only?: boolean;
    location_type?: string;
    min_salary?: number;
    max_salary?: number;
    availability_status?: string[];
    preferred_roles?: string[];
    page?: number;
    limit?: number;
  }) => apiClient.post<ApiResponse>('/candidate-profiles/search', data),

  // Get specific candidate profile
  getProfile: (profileId: string) =>
    apiClient.get<ApiResponse>(`/candidate-profiles/${profileId}`),
};

// Bulk Job Posting API (Sprint 11-12)
export const bulkJobPostingApi = {
  // Upload CSV file with job postings
  uploadCSV: (file: File, channels?: string, scheduledAt?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (channels) {
      formData.append('channels', channels);
    }
    if (scheduledAt) {
      formData.append('scheduled_at', scheduledAt);
    }
    return apiClient.post<ApiResponse>('/bulk-job-posting/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // List all bulk upload sessions
  listUploads: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => apiClient.get<ApiResponse>('/bulk-job-posting/uploads', { params }),

  // Get detailed upload session
  getUploadDetail: (uploadId: string) =>
    apiClient.get<ApiResponse>(`/bulk-job-posting/uploads/${uploadId}`),

  // Update upload status
  updateUploadStatus: (uploadId: string, newStatus: string) =>
    apiClient.patch<ApiResponse>(`/bulk-job-posting/uploads/${uploadId}/status`, {
      new_status: newStatus,
    }),

  // Cancel upload session
  cancelUpload: (uploadId: string) =>
    apiClient.post<ApiResponse>(`/bulk-job-posting/uploads/${uploadId}/cancel`),

  // Delete upload session
  deleteUpload: (uploadId: string) =>
    apiClient.delete<ApiResponse>(`/bulk-job-posting/uploads/${uploadId}`),

  // Download CSV template
  getTemplate: () => apiClient.get<ApiResponse>('/bulk-job-posting/template'),
};

// Team Collaboration API (Sprint 13-14)
export const teamCollaborationApi = {
  // List team members with optional filtering
  getTeamMembers: (params?: {
    include_suspended?: boolean;
    role?: string;
  }) => apiClient.get<ApiResponse>('/employer/team/members', { params }),

  // Invite new team member
  inviteTeamMember: (data: {
    email: string;
    role: 'owner' | 'admin' | 'hiring_manager' | 'recruiter' | 'interviewer' | 'viewer';
  }) => apiClient.post<ApiResponse>('/employer/team/invite', data),

  // Resend invitation
  resendInvitation: (invitationId: string) =>
    apiClient.post<ApiResponse>(`/employer/team/invitations/${invitationId}/resend`),

  // Revoke invitation
  revokeInvitation: (invitationId: string) =>
    apiClient.delete<ApiResponse>(`/employer/team/invitations/${invitationId}`),

  // Update team member role
  updateMemberRole: (
    memberId: string,
    data: {
      role: 'owner' | 'admin' | 'hiring_manager' | 'recruiter' | 'interviewer' | 'viewer';
    }
  ) => apiClient.patch<ApiResponse>(`/employer/team/members/${memberId}/role`, data),

  // Suspend team member
  suspendMember: (memberId: string, data: { reason?: string }) =>
    apiClient.post<ApiResponse>(`/employer/team/members/${memberId}/suspend`, data),

  // Reactivate suspended member
  reactivateMember: (memberId: string) =>
    apiClient.post<ApiResponse>(`/employer/team/members/${memberId}/reactivate`),

  // Remove team member
  removeMember: (memberId: string) =>
    apiClient.delete<ApiResponse>(`/employer/team/members/${memberId}`),

  // Get team activity feed
  getTeamActivity: (params?: {
    days?: number;
    member_id?: string;
    action_type?: string;
    limit?: number;
  }) => apiClient.get<ApiResponse>('/employer/team/activity', { params }),

  // Get specific member's activity
  getMemberActivity: (memberId: string, params?: { days?: number; limit?: number }) =>
    apiClient.get<ApiResponse>(`/employer/team/members/${memberId}/activity`, { params }),

  // Get current user's permissions
  getMyPermissions: () => apiClient.get<ApiResponse>('/employer/team/permissions'),

  // Accept team invitation
  acceptInvitation: (token: string) =>
    apiClient.post<ApiResponse>(`/employer/team/accept/${token}`),
};

// Interview Scheduling API (Sprint 13-14)
export const interviewSchedulingApi = {
  // Schedule new interview
  scheduleInterview: (data: {
    application_id: string;
    interview_type: 'phone_screen' | 'technical' | 'behavioral' | 'cultural_fit' | 'final' | 'other';
    interview_round: number;
    scheduled_at: string;
    duration_minutes: number;
    timezone: string;
    meeting_platform?: 'zoom' | 'google_meet' | 'microsoft_teams' | 'phone' | 'in_person' | 'other';
    meeting_link?: string;
    location?: string;
    interviewer_ids: string[];
    notes?: string;
  }) => apiClient.post<ApiResponse>('/employer/interviews', data),

  // List all interviews with filtering
  listInterviews: (params?: {
    status?: 'scheduled' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';
    interview_type?: string;
    interviewer_id?: string;
    application_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get<ApiResponse>('/employer/interviews', { params }),

  // Get upcoming interviews
  getUpcomingInterviews: (params?: {
    days?: number;
    interviewer_id?: string;
  }) => apiClient.get<ApiResponse>('/employer/interviews/upcoming', { params }),

  // Get interview details
  getInterviewDetails: (interviewId: string) =>
    apiClient.get<ApiResponse>(`/employer/interviews/${interviewId}`),

  // Reschedule interview
  rescheduleInterview: (
    interviewId: string,
    data: {
      new_time: string;
      timezone?: string;
      reason?: string;
    }
  ) => apiClient.post<ApiResponse>(`/employer/interviews/${interviewId}/reschedule`, data),

  // Cancel interview
  cancelInterview: (interviewId: string, data: { reason?: string }) =>
    apiClient.delete<ApiResponse>(`/employer/interviews/${interviewId}`, { data }),

  // Assign additional interviewers
  assignInterviewers: (
    interviewId: string,
    data: {
      interviewer_ids: string[];
    }
  ) => apiClient.post<ApiResponse>(`/employer/interviews/${interviewId}/assign`, data),

  // Submit interview feedback
  submitFeedback: (
    interviewId: string,
    data: {
      overall_rating?: number;
      technical_rating?: number;
      communication_rating?: number;
      culture_fit_rating?: number;
      strengths: string[];
      concerns: string[];
      notes?: string;
      recommendation?: 'yes' | 'no' | 'maybe';
      next_steps?: string;
    }
  ) => apiClient.post<ApiResponse>(`/employer/interviews/${interviewId}/feedback`, data),

  // Get interview feedback
  getFeedback: (interviewId: string) =>
    apiClient.get<ApiResponse>(`/employer/interviews/${interviewId}/feedback`),

  // Request candidate availability
  requestCandidateAvailability: (
    applicationId: string,
    data: {
      interview_type: string;
      duration_minutes: number;
      timezone: string;
      preferred_platforms?: string[];
      notes?: string;
    }
  ) => apiClient.post<ApiResponse>(`/employer/applications/${applicationId}/request-availability`, data),

  // Get candidate availability
  getCandidateAvailability: (applicationId: string) =>
    apiClient.get<ApiResponse>(`/employer/applications/${applicationId}/availability`),

  // Get aggregated feedback for application
  getAggregatedFeedback: (applicationId: string) =>
    apiClient.get<ApiResponse>(`/employer/interviews/applications/${applicationId}/feedback/aggregated`),

  // Sync interview to calendar
  syncToCalendar: (
    interviewId: string,
    data: {
      calendar_provider: 'google' | 'outlook' | 'other';
    }
  ) => apiClient.post<ApiResponse>(`/employer/interviews/${interviewId}/calendar/sync`, data),

  // Send calendar invites
  sendCalendarInvites: (interviewId: string) =>
    apiClient.post<ApiResponse>(`/employer/interviews/${interviewId}/calendar/invite`),
};

// Employer Analytics API (Sprint 15-16)
export const employerAnalyticsApi = {
  // Get analytics overview with summary metrics
  getOverview: (companyId: string, params?: {
    start_date?: string;
    end_date?: string;
  }) => apiClient.get<ApiResponse>(`/employer/companies/${companyId}/analytics/overview`, { params }),

  // Get pipeline funnel visualization data
  getFunnel: (companyId: string, params?: {
    job_id?: string;
  }) => apiClient.get<ApiResponse>(`/employer/companies/${companyId}/analytics/funnel`, { params }),

  // Get sourcing metrics (application sources)
  getSources: (companyId: string, params?: {
    start_date?: string;
    end_date?: string;
  }) => apiClient.get<ApiResponse>(`/employer/companies/${companyId}/analytics/sources`, { params }),

  // Get time metrics (time-to-hire, time-to-offer)
  getTimeMetrics: (companyId: string, params?: {
    start_date?: string;
    end_date?: string;
  }) => apiClient.get<ApiResponse>(`/employer/companies/${companyId}/analytics/time-metrics`, { params }),

  // Get quality metrics (fit index, retention)
  getQuality: (companyId: string) =>
    apiClient.get<ApiResponse>(`/employer/companies/${companyId}/analytics/quality`),

  // Get cost metrics (owner/admin only)
  getCosts: (companyId: string, params?: {
    start_date?: string;
    end_date?: string;
  }) => apiClient.get<ApiResponse>(`/employer/companies/${companyId}/analytics/costs`, { params }),
};

// API Key Management API (Sprint 17-18)
export const apiKeyApi = {
  // List all API keys for the company
  list: (params?: { page?: number; page_size?: number }) =>
    apiClient.get('/employer/api-keys/', { params }),

  // Get a specific API key by ID
  get: (keyId: string) =>
    apiClient.get(`/employer/api-keys/${keyId}`),

  // Create a new API key
  create: (data: {
    name: string;
    permissions?: {
      jobs?: string[];
      candidates?: string[];
      applications?: string[];
      webhooks?: string[];
      analytics?: string[];
    };
    rate_limit_tier?: 'standard' | 'elevated' | 'enterprise';
    expires_at?: string;
  }) => apiClient.post('/employer/api-keys/', data),

  // Update an API key
  update: (keyId: string, data: {
    name?: string;
    permissions?: {
      jobs?: string[];
      candidates?: string[];
      applications?: string[];
      webhooks?: string[];
      analytics?: string[];
    };
    rate_limit_tier?: 'standard' | 'elevated' | 'enterprise';
  }) => apiClient.patch(`/employer/api-keys/${keyId}`, data),

  // Revoke an API key
  revoke: (keyId: string) =>
    apiClient.delete(`/employer/api-keys/${keyId}`),

  // Get usage statistics for an API key
  getUsage: (keyId: string, params?: { days?: number }) =>
    apiClient.get(`/employer/api-keys/${keyId}/usage`, { params }),
};

// Assessment API (Sprint 17-18 Phase 4)
export const assessmentApi = {
  // Assessment Management (Employer)
  createAssessment: (data: {
    title: string;
    description?: string;
    assessment_type: 'pre_screening' | 'technical' | 'personality' | 'skills_test' | 'custom';
    time_limit_minutes?: number;
    passing_score_percentage?: number;
    max_attempts?: number;
    randomize_questions?: boolean;
    randomize_options?: boolean;
    show_results_to_candidate?: boolean;
    show_correct_answers?: boolean;
    enable_proctoring?: boolean;
    allow_tab_switching?: boolean;
    max_tab_switches?: number;
    require_webcam?: boolean;
  }) => apiClient.post<ApiResponse>('/assessments/', data),

  listAssessments: (params?: {
    status?: 'draft' | 'published' | 'archived';
    assessment_type?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get<ApiResponse>('/assessments/', { params }),

  getAssessment: (assessmentId: string) =>
    apiClient.get<ApiResponse>(`/assessments/${assessmentId}`),

  updateAssessment: (assessmentId: string, data: Partial<any>) =>
    apiClient.put<ApiResponse>(`/assessments/${assessmentId}`, data),

  deleteAssessment: (assessmentId: string) =>
    apiClient.delete<ApiResponse>(`/assessments/${assessmentId}`),

  publishAssessment: (assessmentId: string) =>
    apiClient.post<ApiResponse>(`/assessments/${assessmentId}/publish`),

  cloneAssessment: (assessmentId: string, data: { new_title: string }) =>
    apiClient.post<ApiResponse>(`/assessments/${assessmentId}/clone`, data),

  getStatistics: (assessmentId: string) =>
    apiClient.get<ApiResponse>(`/assessments/${assessmentId}/statistics`),

  // Question Management
  addQuestion: (assessmentId: string, data: {
    question_type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'text' | 'file_upload';
    question_text: string;
    points: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    tags?: string[];
    options?: Array<{ text: string; is_correct: boolean }>;
    coding_language?: string;
    test_cases?: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
    file_types_allowed?: string[];
    max_file_size_mb?: number;
  }) => apiClient.post<ApiResponse>(`/assessments/${assessmentId}/questions`, data),

  listQuestions: (assessmentId: string) =>
    apiClient.get<ApiResponse>(`/assessments/${assessmentId}/questions`),

  updateQuestion: (questionId: string, data: Partial<any>) =>
    apiClient.put<ApiResponse>(`/assessments/questions/${questionId}`, data),

  deleteQuestion: (questionId: string) =>
    apiClient.delete<ApiResponse>(`/assessments/questions/${questionId}`),

  reorderQuestions: (data: { question_orders: Array<{ question_id: string; display_order: number }> }) =>
    apiClient.post<ApiResponse>('/assessments/questions/reorder', data),

  bulkImportQuestions: (assessmentId: string, data: { question_bank_ids: string[] }) =>
    apiClient.post<ApiResponse>(`/assessments/${assessmentId}/questions/bulk-import`, data),

  // Question Bank
  createQuestionBankItem: (data: {
    question_type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'text' | 'file_upload';
    question_text: string;
    points: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    tags?: string[];
    is_public?: boolean;
    options?: Array<{ text: string; is_correct: boolean }>;
    coding_language?: string;
    test_cases?: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
  }) => apiClient.post<ApiResponse>('/assessments/question-bank', data),

  searchQuestionBank: (params?: {
    question_type?: string;
    difficulty?: string;
    category?: string;
    tags?: string[];
    is_public?: boolean;
    page?: number;
    limit?: number;
  }) => apiClient.get<ApiResponse>('/assessments/question-bank', { params }),

  getQuestionBankItem: (questionId: string) =>
    apiClient.get<ApiResponse>(`/assessments/question-bank/${questionId}`),

  updateQuestionBankItem: (questionId: string, data: Partial<any>) =>
    apiClient.put<ApiResponse>(`/assessments/question-bank/${questionId}`, data),

  deleteQuestionBankItem: (questionId: string) =>
    apiClient.delete<ApiResponse>(`/assessments/question-bank/${questionId}`),

  // Candidate Assessment Taking
  startAssessment: (assessmentId: string, applicationId?: string) =>
    apiClient.post<ApiResponse>(`/assessments/${assessmentId}/start`, { application_id: applicationId }),

  getAttempt: (attemptId: string) =>
    apiClient.get<ApiResponse>(`/assessments/attempts/${attemptId}`),

  getAttemptQuestions: (attemptId: string) =>
    apiClient.get<ApiResponse>(`/assessments/attempts/${attemptId}/questions`),

  submitResponse: (attemptId: string, data: {
    question_id: string;
    response_data: {
      selected_option_ids?: string[];
      text_response?: string;
      code_response?: string;
      file_upload_url?: string;
    };
  }) => apiClient.post<ApiResponse>(`/assessments/attempts/${attemptId}/responses`, data),

  submitAssessment: (attemptId: string) =>
    apiClient.post<ApiResponse>(`/assessments/attempts/${attemptId}/submit`),

  recordTabSwitch: (attemptId: string) =>
    apiClient.post<ApiResponse>(`/assessments/attempts/${attemptId}/tab-switch`),

  resumeAssessment: (assessmentId: string) =>
    apiClient.get<ApiResponse>(`/assessments/assessments/${assessmentId}/resume`),

  getMyAttempts: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse>('/assessments/my-attempts', { params }),

  // Grading & Review
  manualGradeResponse: (responseId: string, data: {
    points_awarded: number;
    feedback?: string;
  }) => apiClient.post<ApiResponse>(`/assessments/responses/${responseId}/grade`, data),

  autoGradeAttempt: (attemptId: string) =>
    apiClient.post<ApiResponse>(`/assessments/attempts/${attemptId}/grade`),

  getUngradedResponses: (assessmentId: string) =>
    apiClient.get<ApiResponse>(`/assessments/assessments/${assessmentId}/ungraded`),

  bulkGradeResponses: (data: {
    grades: Array<{ response_id: string; points_awarded: number; feedback?: string }>;
  }) => apiClient.post<ApiResponse>('/assessments/attempts/bulk-grade', data),

  // Job Assessment Requirements
  linkAssessmentToJob: (jobId: string, data: {
    assessment_id: string;
    is_required?: boolean;
    must_pass_to_proceed?: boolean;
    order?: number;
    deadline_hours_after_application?: number;
    send_reminder_hours_before_deadline?: number;
    show_before_application?: boolean;
    trigger_point?: 'before_application' | 'after_application' | 'before_interview';
  }) => apiClient.post<ApiResponse>(`/assessments/jobs/${jobId}/assessments`, data),

  getJobAssessments: (jobId: string) =>
    apiClient.get<ApiResponse>(`/assessments/jobs/${jobId}/assessments`),
};

// Candidate Assessment Taking API (Sprint 19-20 Week 37/38)
export const candidateAssessmentApi = {
  // Access assessment via token
  accessAssessment: (accessToken: string) =>
    apiClient.get<ApiResponse>(`/candidate-assessments/access/${accessToken}`),

  // Start assessment attempt
  startAssessment: (assessmentId: string, data?: {
    ip_address?: string;
    user_agent?: string;
  }) => apiClient.post<ApiResponse>(`/candidate-assessments/${assessmentId}/start`, data || {}),

  // Submit answer to a question
  submitAnswer: (attemptId: string, data: {
    question_id: string;
    answer_data: Record<string, any>;
    time_spent_seconds?: number;
  }) => apiClient.post<ApiResponse>(`/candidate-assessments/attempts/${attemptId}/responses`, data),

  // Execute code for coding challenge
  executeCode: (attemptId: string, data: {
    question_id: string;
    code: string;
    language: string;
    save_to_response?: boolean;
  }) => apiClient.post<ApiResponse>(`/candidate-assessments/attempts/${attemptId}/execute-code`, data),

  // Track anti-cheating event
  trackEvent: (attemptId: string, data: {
    event_type: 'tab_switch' | 'copy_paste' | 'ip_change' | 'full_screen_exit' | 'suspicious_behavior';
    details?: Record<string, any>;
  }) => apiClient.post<ApiResponse>(`/candidate-assessments/attempts/${attemptId}/track-event`, data),

  // Submit final assessment
  submitAssessment: (attemptId: string) =>
    apiClient.post<ApiResponse>(`/candidate-assessments/attempts/${attemptId}/submit`),

  // Get assessment results
  getResults: (attemptId: string) =>
    apiClient.get<ApiResponse>(`/candidate-assessments/attempts/${attemptId}/results`),

  // Get attempt progress
  getProgress: (attemptId: string) =>
    apiClient.get<ApiResponse>(`/candidate-assessments/attempts/${attemptId}/progress`),
};

// White-Label Branding API (Sprint 17-18 Phase 3)
export const whiteLabelApi = {
  // Get white-label branding configuration
  getConfig: () =>
    apiClient.get<ApiResponse>('/employer/white-label/config'),

  // Update white-label branding configuration
  updateConfig: (data: {
    company_display_name?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    text_color?: string;
    background_color?: string;
    button_color?: string;
    link_color?: string;
    font_family?: string;
    hide_hireflux_branding?: boolean;
    custom_css?: string;
    email_from_name?: string;
    email_reply_to?: string;
    email_header_text?: string;
    email_footer_text?: string;
    career_page_title?: string;
    career_page_description?: string;
    career_page_banner_text?: string;
  }) => apiClient.put<ApiResponse>('/employer/white-label/config', data),

  // Enable white-label features (requires Enterprise plan)
  enable: () =>
    apiClient.post<ApiResponse>('/employer/white-label/enable'),

  // Disable white-label features
  disable: () =>
    apiClient.post<ApiResponse>('/employer/white-label/disable'),

  // Upload logo (primary, dark, icon, email)
  uploadLogo: (logoType: 'primary' | 'dark' | 'icon' | 'email', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse>(
      `/employer/white-label/logos/${logoType}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },

  // Delete logo
  deleteLogo: (logoType: 'primary' | 'dark' | 'icon' | 'email') =>
    apiClient.delete<ApiResponse>(`/employer/white-label/logos/${logoType}`),

  // Set custom domain
  setCustomDomain: (domain: string) =>
    apiClient.post<ApiResponse>('/employer/white-label/domain', { domain }),

  // Verify custom domain
  verifyCustomDomain: () =>
    apiClient.post<ApiResponse>('/employer/white-label/domain/verify'),

  // Get domain verification status
  getDomainVerification: () =>
    apiClient.get<ApiResponse>('/employer/white-label/domain/verification'),

  // Delete custom domain
  deleteCustomDomain: () =>
    apiClient.delete<ApiResponse>('/employer/white-label/domain'),

  // Manage custom application fields
  getCustomFields: () =>
    apiClient.get<ApiResponse>('/employer/white-label/custom-fields'),

  createCustomField: (data: {
    field_name: string;
    field_label: string;
    field_type: 'text' | 'textarea' | 'select' | 'checkbox' | 'file';
    field_options?: string[];
    is_required?: boolean;
    help_text?: string;
  }) => apiClient.post<ApiResponse>('/employer/white-label/custom-fields', data),

  updateCustomField: (
    fieldId: string,
    data: {
      field_label?: string;
      field_options?: string[];
      is_required?: boolean;
      help_text?: string;
      display_order?: number;
    }
  ) => apiClient.patch<ApiResponse>(`/employer/white-label/custom-fields/${fieldId}`, data),

  deleteCustomField: (fieldId: string) =>
    apiClient.delete<ApiResponse>(`/employer/white-label/custom-fields/${fieldId}`),

  // Preview branded pages
  previewCareerPage: () =>
    apiClient.get<ApiResponse>('/employer/white-label/preview/career-page'),

  previewEmail: (templateType: 'application_received' | 'interview_scheduled' | 'status_update') =>
    apiClient.get<ApiResponse>(`/employer/white-label/preview/email/${templateType}`),
};

export default apiClient;
