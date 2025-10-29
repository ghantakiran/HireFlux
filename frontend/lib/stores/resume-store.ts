import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Types based on backend schemas
export interface ContactInfo {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  website?: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  responsibilities: string[];
  is_current: boolean;
}

export interface Education {
  institution: string;
  degree?: string;
  field_of_study?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  gpa?: string;
  honors: string[];
}

export interface Certification {
  name: string;
  issuing_organization: string;
  issue_date?: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface ParsedResumeData {
  contact_info: ContactInfo;
  summary?: string;
  work_experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  languages: string[];
  projects: any[];
  awards: string[];
  publications: string[];
  raw_text?: string;
}

export enum ParseStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  original_file_url?: string;
  parse_status: ParseStatus;
  is_default: boolean;
  parsed_data?: ParsedResumeData;
  parse_error?: string;
  created_at: string;
  parsed_at?: string;
}

export interface ResumeMetadata {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  parse_status: ParseStatus;
  is_default: boolean;
  created_at: string;
  parsed_at?: string;
}

interface ResumeState {
  // State
  resumes: ResumeMetadata[];
  currentResume: Resume | null;
  defaultResumeId: string | null;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  uploadProgress: number;

  // Actions
  fetchResumes: () => Promise<void>;
  fetchResume: (resumeId: string) => Promise<void>;
  uploadResume: (file: File) => Promise<Resume>;
  deleteResume: (resumeId: string) => Promise<void>;
  setDefaultResume: (resumeId: string) => Promise<void>;
  updateParsedData: (resumeId: string, parsedData: ParsedResumeData) => Promise<void>;
  downloadResume: (resumeId: string) => Promise<void>;
  clearError: () => void;
  clearCurrentResume: () => void;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

// Axios instance with auth
const createAuthAxios = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      // Initial state
      resumes: [],
      currentResume: null,
      defaultResumeId: null,
      isLoading: false,
      isUploading: false,
      error: null,
      uploadProgress: 0,

      // Fetch all resumes
      fetchResumes: async () => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.get('/resumes');

          const { resumes, default_resume_id } = response.data.data;

          set({
            resumes,
            defaultResumeId: default_resume_id,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to fetch resumes';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Fetch single resume
      fetchResume: async (resumeId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.get(`/resumes/${resumeId}`);

          set({
            currentResume: response.data.data,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to fetch resume';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Upload resume
      uploadResume: async (file: File) => {
        try {
          set({ isUploading: true, error: null, uploadProgress: 0 });

          // Validate file
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit');
          }

          const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ];
          if (!allowedTypes.includes(file.type)) {
            throw new Error('Only PDF and DOCX files are allowed');
          }

          const formData = new FormData();
          formData.append('file', file);

          const token = getAuthToken();
          const response = await axios.post(`${API_URL}/resumes/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: token ? `Bearer ${token}` : '',
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = progressEvent.total
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0;
              set({ uploadProgress: percentCompleted });
            },
          });

          const uploadedResume = response.data.data;

          // Add to resumes list
          const { resumes } = get();
          set({
            resumes: [uploadedResume, ...resumes],
            isUploading: false,
            uploadProgress: 100,
          });

          // If first resume, set as default
          if (resumes.length === 0) {
            await get().setDefaultResume(uploadedResume.id);
          }

          return uploadedResume;
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || error.message || 'Failed to upload resume';
          set({ error: errorMessage, isUploading: false, uploadProgress: 0 });
          throw error;
        }
      },

      // Delete resume
      deleteResume: async (resumeId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          await api.delete(`/resumes/${resumeId}`);

          // Remove from local state
          const { resumes, defaultResumeId, currentResume } = get();
          const updatedResumes = resumes.filter((r) => r.id !== resumeId);

          set({
            resumes: updatedResumes,
            defaultResumeId: defaultResumeId === resumeId ? null : defaultResumeId,
            currentResume: currentResume?.id === resumeId ? null : currentResume,
            isLoading: false,
          });

          // If deleted default resume and other resumes exist, set first as default
          if (defaultResumeId === resumeId && updatedResumes.length > 0) {
            await get().setDefaultResume(updatedResumes[0].id);
          }
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to delete resume';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Set default resume
      setDefaultResume: async (resumeId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          await api.post(`/resumes/${resumeId}/set-default`);

          // Update local state
          const { resumes } = get();
          const updatedResumes = resumes.map((r) => ({
            ...r,
            is_default: r.id === resumeId,
          }));

          set({
            resumes: updatedResumes,
            defaultResumeId: resumeId,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to set default resume';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Update parsed data
      updateParsedData: async (resumeId: string, parsedData: ParsedResumeData) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.put(`/resumes/${resumeId}/parsed-data`, {
            parsed_data: parsedData,
          });

          // Update current resume if it's the one being edited
          const { currentResume } = get();
          if (currentResume?.id === resumeId) {
            set({
              currentResume: {
                ...currentResume,
                parsed_data: response.data.data.parsed_data,
              },
            });
          }

          set({ isLoading: false });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to update resume';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Download resume
      downloadResume: async (resumeId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.get(`/resumes/${resumeId}/download`);

          // For now, just return the file URL
          // TODO: Implement actual file download when backend is ready
          const fileUrl = response.data.data.file_url;
          if (fileUrl) {
            window.open(fileUrl, '_blank');
          } else {
            throw new Error('File download not yet implemented on backend');
          }

          set({ isLoading: false });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to download resume';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Clear current resume
      clearCurrentResume: () => set({ currentResume: null }),
    }),
    {
      name: 'resume-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        resumes: state.resumes,
        defaultResumeId: state.defaultResumeId,
      }),
    }
  )
);
