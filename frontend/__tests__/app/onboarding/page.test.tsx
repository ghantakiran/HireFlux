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

    it('should navigate to step 2 after completing step 1', async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      const getStartedBtn = screen.getByRole('button', { name: /Get Started/i });
      await user.click(getStartedBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/phone/i), '+1 (555) 123-4567');
      await user.type(screen.getByLabelText(/location/i), 'San Francisco, CA');

      const continueBtn = screen.getByRole('button', { name: /Continue/i });
      await user.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText(/step 2/i)).toBeInTheDocument();
        expect(screen.getByText(/job preferences/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Job Preferences', () => {
    const navigateToStep2 = async (user: any) => {
      const { container } = render(<OnboardingPage />);

      const getStartedBtn = screen.getByRole('button', { name: /Get Started/i });
      await user.click(getStartedBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/phone/i), '+1 (555) 123-4567');
      await user.type(screen.getByLabelText(/location/i), 'San Francisco, CA');

      const continueBtn = screen.getByRole('button', { name: /Continue/i });
      await user.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText(/step 2/i)).toBeInTheDocument();
      });

      return container;
    };

    it('should render job preferences form fields', async () => {
      const user = userEvent.setup();
      await navigateToStep2(user);

      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minimum salary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximum salary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/industries/i)).toBeInTheDocument();
    });

    it('should validate required fields in step 2', async () => {
      const user = userEvent.setup();
      await navigateToStep2(user);

      const continueBtn = screen.getByRole('button', { name: /Continue/i });
      await user.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText(/at least one.*title/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Skills', () => {
    const navigateToStep3 = async (user: any) => {
      await render(<OnboardingPage />);

      let btn = screen.getByRole('button', { name: /Get Started/i });
      await user.click(btn);

      await waitFor(() => expect(screen.getByLabelText(/phone/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/phone/i), '+1 (555) 123-4567');
      await user.type(screen.getByLabelText(/location/i), 'San Francisco, CA');
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument());

      // Fill step 2 minimally
      const titleInput = screen.getByLabelText(/job title/i);
      await user.type(titleInput, 'Software Engineer{enter}');

      await user.type(screen.getByLabelText(/minimum salary/i), '100000');
      await user.type(screen.getByLabelText(/maximum salary/i), '150000');

      const industryInput = screen.getByLabelText(/industries/i);
      await user.type(industryInput, 'Technology{enter}');

      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/step 3/i)).toBeInTheDocument();
      });
    };

    it('should render skills form fields', async () => {
      const user = userEvent.setup();
      await navigateToStep3(user);

      expect(screen.getByLabelText(/skills/i)).toBeInTheDocument();
    });

    it('should validate at least one skill required', async () => {
      const user = userEvent.setup();
      await navigateToStep3(user);

      const continueBtn = screen.getByRole('button', { name: /Continue/i });
      await user.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText(/at least one skill/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 4: Work Preferences', () => {
    it('should render work preferences form', async () => {
      const user = userEvent.setup();
      await render(<OnboardingPage />);

      // Navigate through all steps quickly
      await user.click(screen.getByRole('button', { name: /Get Started/i }));

      await waitFor(() => expect(screen.getByLabelText(/phone/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/phone/i), '+1 (555) 123-4567');
      await user.type(screen.getByLabelText(/location/i), 'San Francisco, CA');
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/job title/i), 'Engineer{enter}');
      await user.type(screen.getByLabelText(/minimum salary/i), '100000');
      await user.type(screen.getByLabelText(/maximum salary/i), '150000');
      await user.type(screen.getByLabelText(/industries/i), 'Tech{enter}');
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => expect(screen.getByText(/step 3/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/skills/i), 'React{enter}');
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/step 4/i)).toBeInTheDocument();
        expect(screen.getByText(/remote.*preference/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Onboarding', () => {
    it('should submit all data on final step', async () => {
      const user = userEvent.setup();
      const mockOnboardingData = {
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
        target_titles: ['Software Engineer'],
        salary_min: 100000,
        salary_max: 150000,
        industries: ['Technology'],
        skills: ['React', 'TypeScript'],
        remote_preference: 'remote',
        visa_sponsorship: false,
        willing_to_relocate: false,
        preferred_locations: [],
      };

      (userApi.completeOnboarding as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await render(<OnboardingPage />);

      // Complete all steps
      await user.click(screen.getByRole('button', { name: /Get Started/i }));

      await waitFor(() => expect(screen.getByLabelText(/phone/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/phone/i), mockOnboardingData.phone);
      await user.type(screen.getByLabelText(/location/i), mockOnboardingData.location);
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/job title/i), mockOnboardingData.target_titles[0] + '{enter}');
      await user.type(screen.getByLabelText(/minimum salary/i), mockOnboardingData.salary_min.toString());
      await user.type(screen.getByLabelText(/maximum salary/i), mockOnboardingData.salary_max.toString());
      await user.type(screen.getByLabelText(/industries/i), mockOnboardingData.industries[0] + '{enter}');
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => expect(screen.getByText(/step 3/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/skills/i), 'React{enter}TypeScript{enter}');
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => expect(screen.getByText(/step 4/i)).toBeInTheDocument());
      await user.click(screen.getByLabelText(/remote/i));
      await user.click(screen.getByRole('button', { name: /Complete|Finish/i }));

      await waitFor(() => {
        expect(userApi.completeOnboarding).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});
