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

export default apiClient;
