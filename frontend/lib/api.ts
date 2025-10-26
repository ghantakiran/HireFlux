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

  getVersions: () => apiClient.get<ApiResponse>('/resumes/versions'),

  tailorToJob: (id: string, data: { job_description: string }) =>
    apiClient.post<ApiResponse>(`/resumes/${id}/tailor`, data),
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

// Subscription API
export const subscriptionApi = {
  getPlans: () => apiClient.get<ApiResponse>('/subscriptions/plans'),

  createCheckoutSession: (data: {
    plan_id: string;
    success_url: string;
    cancel_url: string;
  }) => apiClient.post<ApiResponse>('/subscriptions/checkout', data),

  getCurrentSubscription: () => apiClient.get<ApiResponse>('/subscriptions/current'),

  cancelSubscription: () => apiClient.post<ApiResponse>('/subscriptions/cancel'),
};

// Credits API
export const creditsApi = {
  getBalance: () => apiClient.get<ApiResponse>('/credits/balance'),

  purchaseCredits: (data: {
    amount: number;
    success_url: string;
    cancel_url: string;
  }) => apiClient.post<ApiResponse>('/credits/purchase', data),

  getLedger: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse>('/credits/ledger', { params }),
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

export default apiClient;
