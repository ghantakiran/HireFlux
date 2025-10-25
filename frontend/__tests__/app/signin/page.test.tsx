import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInPage from '@/app/signin/page';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Sign In Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should render sign in form', () => {
    render(<SignInPage />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        data: {
          access_token: 'token123',
          refresh_token: 'refresh123',
          user: {
            id: '1',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
          },
        },
      },
    };

    (authApi.login as jest.Mock).mockResolvedValue(mockResponse);

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';

    (authApi.login as jest.Mock).mockRejectedValue({
      response: {
        data: {
          error: {
            message: errorMessage,
          },
        },
      },
    });

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should have link to sign up page', () => {
    render(<SignInPage />);

    const signUpLink = screen.getByRole('link', { name: /sign up/i });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute('href', '/signup');
  });

  it('should have forgot password link', () => {
    render(<SignInPage />);

    const forgotLink = screen.getByRole('link', { name: /forgot.*password/i });
    expect(forgotLink).toBeInTheDocument();
  });

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup();
    (authApi.login as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });
});
