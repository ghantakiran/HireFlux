import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, userApi } from '../api';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
  subscription_tier?: string;
  is_verified?: boolean;
  oauth_provider?: 'google' | 'linkedin' | 'facebook' | 'apple' | null;
  oauth_provider_id?: string;
  oauth_picture?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
      },

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.login({ email, password });
          const { access_token, refresh_token, user } = response.data.data;

          get().setTokens(access_token, refresh_token);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error?.message || 'Failed to sign in. Please try again.';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      register: async (data: any) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.register(data);
          const { access_token, refresh_token, user } = response.data.data;

          get().setTokens(access_token, refresh_token);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error?.message || 'Failed to create account. Please try again.';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Optionally call logout API endpoint
          await authApi.logout().catch(() => {});
        } catch (error) {
          console.error('Logout API error:', error);
        } finally {
          // Clear state regardless of API call result
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      refreshAccessToken: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await authApi.refreshToken(refreshToken);
          const { access_token } = response.data.data;

          set({ accessToken: access_token });
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', access_token);
          }
        } catch (error) {
          // Refresh failed, log out user
          await get().logout();
          throw error;
        }
      },

      initializeAuth: async () => {
        try {
          set({ isLoading: true });

          // Check for stored tokens
          const accessToken =
            typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
          const refreshToken =
            typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

          if (!accessToken || !refreshToken) {
            set({ isInitialized: true, isLoading: false });
            return;
          }

          // Try to get current user with existing token
          try {
            const response = await userApi.getMe();
            const user = response.data.data;

            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isInitialized: true,
              isLoading: false,
            });
          } catch (error: any) {
            // Token might be expired, try to refresh
            if (error?.response?.status === 401) {
              try {
                await get().refreshAccessToken();
                // Try getting user again
                const response = await userApi.getMe();
                const user = response.data.data;

                set({
                  user,
                  isAuthenticated: true,
                  isInitialized: true,
                  isLoading: false,
                });
              } catch (refreshError) {
                // Refresh failed, clear tokens
                await get().logout();
                set({ isInitialized: true, isLoading: false });
              }
            } else {
              // Other error, clear tokens
              await get().logout();
              set({ isInitialized: true, isLoading: false });
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isInitialized: true, isLoading: false });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
