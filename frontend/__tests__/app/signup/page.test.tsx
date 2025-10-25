import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignUpPage from '@/app/signup/page';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  authApi: {
    register: jest.fn(),
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Sign Up Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should render sign up form', () => {
    render(<SignUpPage />);

    expect(screen.getByRole('heading', { name: /sign up|create.*account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/first.*name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last.*name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up|create account/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    const submitButton = screen.getByRole('button', { name: /sign up|create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first.*name.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/last.*name.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for weak password', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText(/^password$/i), 'weak');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/password.*8.*characters/i)).toBeInTheDocument();
    });
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText(/^password$/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm.*password/i), 'DifferentPassword123!');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
    });
  });

  it('should handle successful registration', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        data: {
          access_token: 'token123',
          refresh_token: 'refresh123',
          user: {
            id: '1',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
          },
        },
      },
    };

    (authApi.register as jest.Mock).mockResolvedValue(mockResponse);

    render(<SignUpPage />);

    await user.type(screen.getByLabelText(/first.*name/i), 'John');
    await user.type(screen.getByLabelText(/last.*name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm.*password/i), 'ValidPassword123!');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        first_name: 'John',
        last_name: 'Doe',
      });
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('should display error message on registration failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email already exists';

    (authApi.register as jest.Mock).mockRejectedValue({
      response: {
        data: {
          error: {
            message: errorMessage,
          },
        },
      },
    });

    render(<SignUpPage />);

    await user.type(screen.getByLabelText(/first.*name/i), 'John');
    await user.type(screen.getByLabelText(/last.*name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm.*password/i), 'ValidPassword123!');
    await user.click(screen.getByRole('button', { name: /sign up|create account/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should have link to sign in page', () => {
    render(<SignUpPage />);

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/signin');
  });

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup();
    (authApi.register as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<SignUpPage />);

    await user.type(screen.getByLabelText(/first.*name/i), 'John');
    await user.type(screen.getByLabelText(/last.*name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm.*password/i), 'ValidPassword123!');

    const submitButton = screen.getByRole('button', { name: /sign up|create account/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });
});
