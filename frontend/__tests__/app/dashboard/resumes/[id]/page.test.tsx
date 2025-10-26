import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeDetailPage from '@/app/dashboard/resumes/[id]/page';
import { useAuthStore } from '@/lib/stores/auth-store';
import { resumeApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  resumeApi: {
    getResume: jest.fn(),
    updateResume: jest.fn(),
    exportVersion: jest.fn(),
  },
}));

// Mock Next.js router and params
const mockPush = jest.fn();
const mockParams = { id: 'resume-123' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

describe('Resume Detail Page', () => {
  const mockResume = {
    id: 'resume-123',
    title: 'Software Engineer Resume',
    target_role: 'Senior Software Engineer',
    tone: 'professional',
    created_at: '2025-10-20T10:00:00Z',
    updated_at: '2025-10-20T10:00:00Z',
    ats_score: 85,
    content: {
      personal_info: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
      },
      summary: 'Experienced software engineer with 5+ years of expertise in full-stack development.',
      work_experience: [
        {
          id: '1',
          job_title: 'Software Engineer',
          company: 'Tech Company',
          location: 'San Francisco, CA',
          start_date: '2020-01',
          end_date: '2025-01',
          description: 'Built scalable web applications using React and Node.js.',
        },
      ],
      education: [
        {
          id: '1',
          degree: 'Bachelor of Science in Computer Science',
          school: 'University of California',
          location: 'Berkeley, CA',
          graduation_date: '2020',
        },
      ],
      skills: ['React', 'Node.js', 'TypeScript', 'Python', 'AWS'],
    },
  };

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

  describe('Loading and Display', () => {
    it('should show loading state while fetching resume', () => {
      (resumeApi.getResume as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(<ResumeDetailPage />);

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should fetch and display resume data', async () => {
      (resumeApi.getResume as jest.Mock).mockResolvedValue({
        data: { data: mockResume },
      });

      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(resumeApi.getResume).toHaveBeenCalledWith('resume-123');
      });

      expect(screen.getByText(mockResume.title)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    it('should display ATS score', async () => {
      (resumeApi.getResume as jest.Mock).mockResolvedValue({
        data: { data: mockResume },
      });

      render(<ResumeDetailPage />);

      await waitFor(() => {
        const atsScore = screen.getByTestId('ats-score');
        expect(atsScore).toBeInTheDocument();
        expect(atsScore).toHaveTextContent('85');
      });
    });

    it('should display error message on fetch failure', async () => {
      (resumeApi.getResume as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Resume not found',
            },
          },
        },
      });

      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Resume not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Resume Sections', () => {
    beforeEach(async () => {
      (resumeApi.getResume as jest.Mock).mockResolvedValue({
        data: { data: mockResume },
      });
    });

    it('should display personal information section', async () => {
      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText(/John Doe/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/john@example.com/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\+1 \(555\) 123-4567/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/San Francisco, CA/i).length).toBeGreaterThan(0);
      });
    });

    it('should display professional summary section', async () => {
      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Experienced software engineer/i)).toBeInTheDocument();
      });
    });

    it('should display work experience section', async () => {
      render(<ResumeDetailPage />);

      await waitFor(() => {
        const workSection = screen.getByTestId('section-work-experience');
        expect(workSection).toBeInTheDocument();
        expect(screen.getAllByText(/Software Engineer/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Tech Company/i).length).toBeGreaterThan(0);
      });
    });

    it('should display education section', async () => {
      render(<ResumeDetailPage />);

      await waitFor(() => {
        const eduSection = screen.getByTestId('section-education');
        expect(eduSection).toBeInTheDocument();
        expect(screen.getByText(/Bachelor of Science/i)).toBeInTheDocument();
        expect(screen.getByText(/University of California/i)).toBeInTheDocument();
      });
    });

    it('should display skills section', async () => {
      render(<ResumeDetailPage />);

      await waitFor(() => {
        const skillsSection = screen.getByTestId('section-skills');
        expect(skillsSection).toBeInTheDocument();
        expect(screen.getAllByText(/React/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Node\.js/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/TypeScript/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Actions', () => {
    beforeEach(async () => {
      (resumeApi.getResume as jest.Mock).mockResolvedValue({
        data: { data: mockResume },
      });
    });

    it('should have edit button', async () => {
      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
      });
    });

    it('should have download button', async () => {
      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
      });
    });

    it('should have back button that navigates to resume list', async () => {
      const user = userEvent.setup();
      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Back/i }));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/resumes');
    });
  });

  describe('Download Functionality', () => {
    beforeEach(async () => {
      (resumeApi.getResume as jest.Mock).mockResolvedValue({
        data: { data: mockResume },
      });
    });

    it('should show download format options when download button is clicked', async () => {
      const user = userEvent.setup();
      render(<ResumeDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Download/i }));

      await waitFor(() => {
        expect(screen.getByText(/PDF/i)).toBeInTheDocument();
        expect(screen.getByText(/DOCX/i)).toBeInTheDocument();
        expect(screen.getByText(/Plain Text/i)).toBeInTheDocument();
      });
    });
  });
});
