import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumesPage from '@/app/dashboard/resumes/page';
import { useAuthStore } from '@/lib/stores/auth-store';
import { resumeApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  resumeApi: {
    getResumes: jest.fn(),
    deleteResume: jest.fn(),
  },
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Resumes List Page', () => {
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

  describe('Empty State', () => {
    it('should render page heading', async () => {
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: [] },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /My Resumes/i })).toBeInTheDocument();
      });
    });

    it('should show create button', async () => {
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: [] },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        const createButtons = screen.getAllByRole('button', { name: /Create New Resume/i });
        expect(createButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show empty state message when no resumes', async () => {
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: [] },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        expect(screen.getByText(/No resumes yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Resume List', () => {
    const mockResumes = [
      {
        id: '1',
        title: 'Software Engineer Resume',
        target_role: 'Senior Software Engineer',
        created_at: '2025-10-20T10:00:00Z',
        updated_at: '2025-10-20T10:00:00Z',
        ats_score: 85,
      },
      {
        id: '2',
        title: 'Full Stack Developer Resume',
        target_role: 'Full Stack Developer',
        created_at: '2025-10-19T10:00:00Z',
        updated_at: '2025-10-19T10:00:00Z',
        ats_score: 92,
      },
    ];

    it('should fetch and display resumes on load', async () => {
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: mockResumes },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        expect(resumeApi.getResumes).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText(/Software Engineer Resume/i)).toBeInTheDocument();
      expect(screen.getByText(/Full Stack Developer Resume/i)).toBeInTheDocument();
    });

    it('should display ATS scores for resumes', async () => {
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: mockResumes },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        expect(screen.getByText(/85/)).toBeInTheDocument();
        expect(screen.getByText(/92/)).toBeInTheDocument();
      });
    });

    it('should navigate to resume detail when clicked', async () => {
      const user = userEvent.setup();
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: mockResumes },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Software Engineer Resume/i)).toBeInTheDocument();
      });

      const resumeCard = screen.getByText(/Software Engineer Resume/i).closest('[data-testid="resume-card"]');
      await user.click(resumeCard!);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/resumes/1');
    });

    it('should have delete button on each resume card', async () => {
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: mockResumes },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Create Resume', () => {
    it('should navigate to create page when clicking create button', async () => {
      const user = userEvent.setup();
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: [] },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        const createButtons = screen.getAllByRole('button', { name: /Create New Resume/i });
        expect(createButtons.length).toBeGreaterThan(0);
      });

      const createButtons = screen.getAllByRole('button', { name: /Create New Resume/i });
      await user.click(createButtons[0]);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/resumes/new');
    });
  });

  describe('Delete Resume', () => {
    const mockResumes = [
      {
        id: '1',
        title: 'Software Engineer Resume',
        target_role: 'Senior Software Engineer',
        created_at: '2025-10-20T10:00:00Z',
        updated_at: '2025-10-20T10:00:00Z',
        ats_score: 85,
      },
    ];

    it('should show confirmation dialog when delete clicked', async () => {
      const user = userEvent.setup();
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: mockResumes },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Software Engineer Resume/i)).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
      });
    });

    it('should delete resume and refresh list on confirmation', async () => {
      const user = userEvent.setup();
      (resumeApi.getResumes as jest.Mock).mockResolvedValue({
        data: { data: mockResumes },
      });
      (resumeApi.deleteResume as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      render(<ResumesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Software Engineer Resume/i)).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getAllByRole('button', { name: /Delete/i })[1]; // Second delete is in dialog
      await user.click(confirmButton);

      await waitFor(() => {
        expect(resumeApi.deleteResume).toHaveBeenCalledWith('1');
        expect(resumeApi.getResumes).toHaveBeenCalledTimes(2); // Initial + after delete
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching resumes', () => {
      (resumeApi.getResumes as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(<ResumesPage />);

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      (resumeApi.getResumes as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      render(<ResumesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load resumes/i)).toBeInTheDocument();
      });
    });
  });
});
