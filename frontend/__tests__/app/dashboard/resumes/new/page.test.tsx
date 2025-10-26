import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewResumePage from '@/app/dashboard/resumes/new/page';
import { useAuthStore } from '@/lib/stores/auth-store';
import { resumeApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  resumeApi: {
    createResume: jest.fn(),
    upload: jest.fn(),
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('New Resume Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Initial Render', () => {
    it('should render page heading', () => {
      render(<NewResumePage />);
      expect(screen.getByRole('heading', { name: /Create New Resume/i })).toBeInTheDocument();
    });

    it('should show two creation options', () => {
      render(<NewResumePage />);
      expect(screen.getByRole('button', { name: /Start from Scratch/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upload Existing/i })).toBeInTheDocument();
    });
  });

  describe('Start from Scratch Flow', () => {
    it('should show form fields when "Start from Scratch" is clicked', async () => {
      const user = userEvent.setup();
      render(<NewResumePage />);

      const startBtn = screen.getByRole('button', { name: /Start from Scratch/i });
      await user.click(startBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/Resume Title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Target Role/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tone/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Start from Scratch/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Resume Title/i)).toBeInTheDocument();
      });

      const generateBtn = screen.getByRole('button', { name: /Generate Resume/i });
      await user.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText(/title.*required/i)).toBeInTheDocument();
        expect(screen.getByText(/target role.*required/i)).toBeInTheDocument();
      });
    });

    it('should have tone options', async () => {
      const user = userEvent.setup();
      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Start from Scratch/i }));

      await waitFor(() => {
        const toneSelect = screen.getByLabelText(/Tone/i);
        expect(toneSelect).toBeInTheDocument();
      });
    });

    it('should submit form and navigate on success', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          data: {
            id: 'resume-123',
            title: 'Software Engineer Resume',
            target_role: 'Senior Software Engineer',
            tone: 'professional',
          },
        },
      };

      (resumeApi.createResume as jest.Mock).mockResolvedValue(mockResponse);

      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Start from Scratch/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Resume Title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Resume Title/i), 'Software Engineer Resume');
      await user.type(screen.getByLabelText(/Target Role/i), 'Senior Software Engineer');

      const generateBtn = screen.getByRole('button', { name: /Generate Resume/i });
      await user.click(generateBtn);

      await waitFor(() => {
        expect(resumeApi.createResume).toHaveBeenCalledWith({
          title: 'Software Engineer Resume',
          target_role: 'Senior Software Engineer',
          tone: expect.any(String),
        });
        expect(mockPush).toHaveBeenCalledWith('/dashboard/resumes/resume-123');
      });
    });

    it('should show generating state while creating resume', async () => {
      const user = userEvent.setup();
      (resumeApi.createResume as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Start from Scratch/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Resume Title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Resume Title/i), 'Test Resume');
      await user.type(screen.getByLabelText(/Target Role/i), 'Engineer');

      const generateBtn = screen.getByRole('button', { name: /Generate Resume/i });
      await user.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText(/Generating/i)).toBeInTheDocument();
      });
    });
  });

  describe('Upload Existing Flow', () => {
    it('should show file upload when "Upload Existing" is clicked', async () => {
      const user = userEvent.setup();
      render(<NewResumePage />);

      const uploadBtn = screen.getByRole('button', { name: /Upload Existing/i });
      await user.click(uploadBtn);

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload.*resume/i);
        expect(fileInput).toBeInTheDocument();
        expect(fileInput).toHaveAttribute('type', 'file');
      });
    });

    it('should show file name after selecting a file', async () => {
      const user = userEvent.setup();
      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Upload Existing/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/upload.*resume/i)).toBeInTheDocument();
      });

      const file = new File(['resume content'], 'my-resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/upload.*resume/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/my-resume\.pdf/i)).toBeInTheDocument();
      });
    });

    it('should have continue button after file selection', async () => {
      const user = userEvent.setup();
      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Upload Existing/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/upload.*resume/i)).toBeInTheDocument();
      });

      const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/upload.*resume/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
      });
    });
  });

  describe('Back Navigation', () => {
    it('should have back button that resets to options', async () => {
      const user = userEvent.setup();
      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Start from Scratch/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Resume Title/i)).toBeInTheDocument();
      });

      const backBtn = screen.getByRole('button', { name: /Back/i });
      await user.click(backBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start from Scratch/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Upload Existing/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on resume creation failure', async () => {
      const user = userEvent.setup();
      (resumeApi.createResume as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Failed to create resume',
            },
          },
        },
      });

      render(<NewResumePage />);

      await user.click(screen.getByRole('button', { name: /Start from Scratch/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/Resume Title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Resume Title/i), 'Test Resume');
      await user.type(screen.getByLabelText(/Target Role/i), 'Engineer');

      await user.click(screen.getByRole('button', { name: /Generate Resume/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to create resume/i)).toBeInTheDocument();
      });
    });
  });
});
