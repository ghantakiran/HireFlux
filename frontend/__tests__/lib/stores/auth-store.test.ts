import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/lib/stores/auth-store';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.clear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set user and authenticated state on login', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should clear user on logout', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set error state', () => {
    const { result } = renderHook(() => useAuthStore());
    const errorMessage = 'Authentication failed';

    act(() => {
      result.current.setError(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setError('Some error');
    });

    expect(result.current.error).toBe('Some error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should store tokens in localStorage on setTokens', () => {
    const { result } = renderHook(() => useAuthStore());
    const accessToken = 'access-token-123';
    const refreshToken = 'refresh-token-456';

    act(() => {
      result.current.setTokens(accessToken, refreshToken);
    });

    expect(localStorage.getItem('access_token')).toBe(accessToken);
    expect(localStorage.getItem('refresh_token')).toBe(refreshToken);
  });
});
