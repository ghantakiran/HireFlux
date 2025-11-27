/**
 * ResumePreview Component Tests (Issue #94)
 *
 * TDD/BDD approach for resume/document preview component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumePreview } from '@/components/domain/ResumePreview';

describe('ResumePreview', () => {
  const mockResumeUrl = 'https://example.com/resume.pdf';
  const mockResumeName = 'john-doe-resume.pdf';

  describe('Basic Rendering', () => {
    it('should render resume preview container', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} />);
      const preview = container.querySelector('[data-resume-preview]');
      expect(preview).toBeInTheDocument();
    });

    it('should render resume name when provided', () => {
      render(<ResumePreview url={mockResumeUrl} fileName={mockResumeName} />);
      expect(screen.getByText(mockResumeName)).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(<ResumePreview url={mockResumeUrl} title="Candidate Resume" />);
      expect(screen.getByText('Candidate Resume')).toBeInTheDocument();
    });
  });

  describe('PDF Viewer', () => {
    it('should render iframe viewer', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', mockResumeUrl);
    });

    it('should set iframe title for accessibility', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} fileName={mockResumeName} />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveAttribute('title');
    });

    it('should apply custom height', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} height={800} />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveStyle({ height: '800px' });
    });

    it('should use default height when not specified', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveStyle({ height: '600px' });
    });
  });

  describe('Download Action', () => {
    it('should render download button', () => {
      render(<ResumePreview url={mockResumeUrl} />);
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });

    it('should call onDownload when download button clicked', async () => {
      const onDownload = jest.fn();
      render(<ResumePreview url={mockResumeUrl} onDownload={onDownload} />);

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await userEvent.click(downloadButton);

      expect(onDownload).toHaveBeenCalled();
    });

    it('should have download link with correct URL', () => {
      render(<ResumePreview url={mockResumeUrl} />);
      const downloadLink = screen.getByRole('button', { name: /download/i }).closest('a');
      expect(downloadLink).toHaveAttribute('href', mockResumeUrl);
    });

    it('should set download attribute with filename', () => {
      render(<ResumePreview url={mockResumeUrl} fileName={mockResumeName} />);
      const downloadLink = screen.getByRole('button', { name: /download/i }).closest('a');
      expect(downloadLink).toHaveAttribute('download', mockResumeName);
    });
  });

  describe('Print Action', () => {
    it('should render print button when showPrint is true', () => {
      render(<ResumePreview url={mockResumeUrl} showPrint />);
      expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
    });

    it('should not render print button when showPrint is false', () => {
      render(<ResumePreview url={mockResumeUrl} showPrint={false} />);
      expect(screen.queryByRole('button', { name: /print/i })).not.toBeInTheDocument();
    });

    it('should call onPrint when print button clicked', async () => {
      const onPrint = jest.fn();
      render(<ResumePreview url={mockResumeUrl} showPrint onPrint={onPrint} />);

      const printButton = screen.getByRole('button', { name: /print/i });
      await userEvent.click(printButton);

      expect(onPrint).toHaveBeenCalled();
    });
  });

  describe('Fullscreen Action', () => {
    it('should render fullscreen button when showFullscreen is true', () => {
      render(<ResumePreview url={mockResumeUrl} showFullscreen />);
      expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
    });

    it('should not render fullscreen button when showFullscreen is false', () => {
      render(<ResumePreview url={mockResumeUrl} showFullscreen={false} />);
      expect(screen.queryByRole('button', { name: /fullscreen/i })).not.toBeInTheDocument();
    });

    it('should call onFullscreen when fullscreen button clicked', async () => {
      const onFullscreen = jest.fn();
      render(<ResumePreview url={mockResumeUrl} showFullscreen onFullscreen={onFullscreen} />);

      const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
      await userEvent.click(fullscreenButton);

      expect(onFullscreen).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      render(<ResumePreview url={mockResumeUrl} loading />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should hide iframe when loading', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} loading />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveClass('hidden');
    });

    it('should disable action buttons when loading', () => {
      render(<ResumePreview url={mockResumeUrl} showPrint showFullscreen loading />);
      expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /print/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /fullscreen/i })).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should show error message when error provided', () => {
      render(<ResumePreview url={mockResumeUrl} error="Failed to load resume" />);
      expect(screen.getByText(/failed to load resume/i)).toBeInTheDocument();
    });

    it('should hide iframe when error occurs', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} error="Error" />);
      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeInTheDocument();
    });

    it('should show retry button when onRetry provided', () => {
      render(<ResumePreview url={mockResumeUrl} error="Error" onRetry={() => {}} />);
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', async () => {
      const onRetry = jest.fn();
      render(<ResumePreview url={mockResumeUrl} error="Error" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Metadata Display', () => {
    it('should show file size when provided', () => {
      render(<ResumePreview url={mockResumeUrl} fileSize={245760} />);
      expect(screen.getByText(/240.*KB/i)).toBeInTheDocument();
    });

    it('should show upload date when provided', () => {
      const uploadDate = new Date('2024-01-15');
      render(<ResumePreview url={mockResumeUrl} uploadDate={uploadDate} />);
      expect(screen.getByText(/Jan.*15/)).toBeInTheDocument();
    });

    it('should show page count when provided', () => {
      render(<ResumePreview url={mockResumeUrl} pageCount={3} showMetadata />);
      expect(screen.getByText(/3.*pages/i)).toBeInTheDocument();
    });

    it('should hide metadata when showMetadata is false', () => {
      render(<ResumePreview url={mockResumeUrl} fileSize={245760} showMetadata={false} />);
      expect(screen.queryByText(/KB/)).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} variant="default" />);
      const preview = container.querySelector('[data-resume-preview]');
      expect(preview).toHaveAttribute('data-variant', 'default');
    });

    it('should render card variant', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} variant="card" />);
      const preview = container.querySelector('[data-resume-preview]');
      expect(preview).toHaveAttribute('data-variant', 'card');
    });

    it('should render minimal variant', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} variant="minimal" />);
      const preview = container.querySelector('[data-resume-preview]');
      expect(preview).toHaveAttribute('data-variant', 'minimal');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for container', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} />);
      const preview = container.querySelector('[data-resume-preview]');
      expect(preview).toHaveAttribute('role', 'region');
    });

    it('should have aria-label for preview container', () => {
      const { container } = render(<ResumePreview url={mockResumeUrl} fileName={mockResumeName} />);
      const preview = container.querySelector('[data-resume-preview]');
      expect(preview).toHaveAttribute('aria-label');
    });

    it('should have accessible download button', () => {
      render(<ResumePreview url={mockResumeUrl} />);
      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toHaveAccessibleName();
    });

    it('should have proper heading level when title provided', () => {
      render(<ResumePreview url={mockResumeUrl} title="Resume" />);
      const heading = screen.getByRole('heading', { name: 'Resume' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing URL gracefully', () => {
      render(<ResumePreview url="" />);
      expect(screen.getByText(/no resume/i)).toBeInTheDocument();
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(200) + '.pdf';
      render(<ResumePreview url={mockResumeUrl} fileName={longName} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should format large file sizes correctly', () => {
      render(<ResumePreview url={mockResumeUrl} fileSize={5242880} />); // 5MB
      expect(screen.getByText(/5.*MB/i)).toBeInTheDocument();
    });

    it('should format small file sizes correctly', () => {
      render(<ResumePreview url={mockResumeUrl} fileSize={512} />); // 512 bytes
      expect(screen.getByText(/512.*B/i)).toBeInTheDocument();
    });
  });
});
