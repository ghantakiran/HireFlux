import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingPage from '@/app/onboarding/page';
import { useAuthStore } from '@/lib/stores/auth-store';
import { userApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  userApi: {
    completeOnboarding: jest.fn(),
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe('Onboarding Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('step');
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  describe('Welcome Screen', () => {
    it('should render welcome screen', () => {
      render(<OnboardingPage />);

      expect(screen.getByRole('heading', { name: /Welcome to HireFlux/i })).toBeInTheDocument();
      expect(screen.getByText(/Let's set up your profile/i)).toBeInTheDocument();
    });

    it('should have a continue button', () => {
      render(<OnboardingPage />);

      expect(screen.getByRole('button', { name: /Continue|Get Started/i })).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should show step 1 when no step parameter', () => {
      render(<OnboardingPage />);

      // Welcome or Step 1 should be visible
      const elements = screen.getAllByText(/Basic Profile|Welcome/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should have progress indicator', () => {
      render(<OnboardingPage />);

      // Should show steps or progress (looking for numbered list or step indicator)
      expect(screen.getByText(/step 1|1\./i) || screen.getByText(/progress/i)).toBeTruthy();
    });
  });

  describe('Step 1: Basic Profile', () => {
    it('should render basic profile form fields', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Click continue to get to step 1
      const continueBtn = screen.getByRole('button', { name: /Get Started/i });
      await user.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields in step 1', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 1
      const getStartedBtn = screen.getByRole('button', { name: /Get Started/i });
      await user.click(getStartedBtn);

      // Wait for step 1 to render
      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      });

      // Try to continue without filling fields
      const continueBtn = screen.getByRole('button', { name: /Continue/i });
      await user.click(continueBtn);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/phone.*required/i)).toBeInTheDocument();
      });
    });
  });
});
