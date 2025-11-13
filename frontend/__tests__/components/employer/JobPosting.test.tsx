/**
 * Tests for JobPosting Component - Sprint 19-20 Week 39 Day 4
 * Following TDD approach: Write tests first, then implement component
 *
 * Job Posting Features:
 * - Multi-step form (basic info, description, requirements, review)
 * - AI job description generation
 * - Form validation
 * - Job preview
 * - Draft/publish functionality
 * - Template selection
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { JobPosting } from '@/components/employer/JobPosting';

// Mock data for testing
const mockJobData = {
  title: 'Senior Software Engineer',
  department: 'Engineering',
  location: 'San Francisco, CA',
  locationType: 'hybrid' as const,
  employmentType: 'full_time' as const,
  experienceLevel: 'senior' as const,
  salaryMin: 130000,
  salaryMax: 170000,
  salaryCurrency: 'USD',
  description: 'We are seeking a talented Senior Software Engineer...',
  requirements: ['5+ years of experience', 'Strong Python skills', 'AWS experience'],
  responsibilities: ['Lead technical projects', 'Mentor junior developers'],
  skills: ['Python', 'React', 'AWS', 'Docker'],
  benefits: ['Health insurance', '401k matching', 'Remote work'],
};

const mockGeneratedDescription = {
  description: 'AI-generated job description content...',
  requirements: ['Requirement 1', 'Requirement 2'],
  responsibilities: ['Responsibility 1', 'Responsibility 2'],
  suggestedSkills: ['Python', 'TypeScript', 'React'],
};

describe('JobPosting Component', () => {
  // Mock handlers
  const mockOnSaveDraft = jest.fn();
  const mockOnPublish = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnGenerateDescription = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render job posting form', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByRole('heading', { name: /create job posting/i })).toBeInTheDocument();
  });

  it('should render all form sections', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Should have step indicators
    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
  });

  it('should render in edit mode with existing data', () => {
    render(
      <JobPosting
        initialData={mockJobData}
        mode="edit"
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByDisplayValue('Senior Software Engineer')).toBeInTheDocument();
  });

  // ========================================================================
  // Step 1: Basic Information Tests
  // ========================================================================

  it('should display job title input', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
  });

  it('should display department input', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
  });

  it('should display location input', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
  });

  it('should display location type selector', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/workplace type/i)).toBeInTheDocument();
  });

  it('should display employment type selector', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/employment type/i)).toBeInTheDocument();
  });

  it('should display experience level selector', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument();
  });

  it('should display salary range inputs', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/minimum salary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum salary/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Form Validation Tests
  // ========================================================================

  it('should validate required fields', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Try to proceed without filling required fields
    const nextButton = screen.getByRole('button', { name: /next|continue/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/job title is required/i)).toBeInTheDocument();
    });
  });

  it('should validate salary range (min < max)', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    const minSalaryInput = screen.getByLabelText(/minimum salary/i);
    const maxSalaryInput = screen.getByLabelText(/maximum salary/i);

    await user.type(minSalaryInput, '150000');
    await user.type(maxSalaryInput, '100000');

    const nextButton = screen.getByRole('button', { name: /next|continue/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/maximum salary.*greater.*minimum/i)).toBeInTheDocument();
    });
  });

  it('should allow progression when basic info is valid', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Fill required fields
    await user.type(screen.getByLabelText(/job title/i), 'Software Engineer');
    await user.type(screen.getByLabelText(/location/i), 'San Francisco');

    const nextButton = screen.getByRole('button', { name: /next|continue/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/step 2/i)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Step 2: AI Job Description Generation Tests
  // ========================================================================

  it('should display AI description generator', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Navigate to step 2
    await user.type(screen.getByLabelText(/job title/i), 'Software Engineer');
    await user.type(screen.getByLabelText(/location/i), 'San Francisco');
    await user.click(screen.getByRole('button', { name: /next|continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate.*ai/i })).toBeInTheDocument();
    });
  });

  it('should call AI generation with correct data', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Navigate to step 2
    await user.type(screen.getByLabelText(/job title/i), 'Senior Software Engineer');
    await user.type(screen.getByLabelText(/location/i), 'San Francisco');
    await user.click(screen.getByRole('button', { name: /next|continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate.*ai/i })).toBeInTheDocument();
    });

    // Click AI generate button
    const generateButton = screen.getByRole('button', { name: /generate.*ai/i });
    await user.click(generateButton);

    expect(mockOnGenerateDescription).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Senior Software Engineer',
        location: 'San Francisco',
      })
    );
  });

  it('should display loading state during AI generation', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
        generatingDescription={true}
      />
    );

    expect(screen.getByText(/generating/i)).toBeInTheDocument();
  });

  it('should populate description from AI generation', () => {
    render(
      <JobPosting
        initialData={{ ...mockJobData, description: mockGeneratedDescription.description }}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByText(/ai-generated job description/i)).toBeInTheDocument();
  });

  it('should allow manual description editing', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Navigate to step 2
    await user.type(screen.getByLabelText(/job title/i), 'Engineer');
    await user.type(screen.getByLabelText(/^location\b/i), 'San Francisco');
    await user.click(screen.getByRole('button', { name: /next|continue/i }));

    await waitFor(() => {
      const descriptionField = screen.getByLabelText(/job description/i);
      expect(descriptionField).toBeInTheDocument();
    });

    const descriptionField = screen.getByLabelText(/job description/i);
    await user.type(descriptionField, 'Manual job description');

    expect(descriptionField).toHaveValue('Manual job description');
  });

  // ========================================================================
  // Step 3: Requirements and Responsibilities Tests
  // ========================================================================

  it('should display requirements input', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Navigate to step 3
    await user.type(screen.getByLabelText(/job title/i), 'Engineer');
    await user.type(screen.getByLabelText(/^location\b/i), 'San Francisco');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/requirements/i)).toBeInTheDocument();
    });
  });

  it('should allow adding multiple requirements', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        initialData={mockJobData}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByText('5+ years of experience')).toBeInTheDocument();
    expect(screen.getByText('Strong Python skills')).toBeInTheDocument();
  });

  it('should allow adding skills', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        initialData={mockJobData}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  // ========================================================================
  // Step 4: Preview and Publish Tests
  // ========================================================================

  it('should display job preview', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        initialData={mockJobData}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Navigate to preview step
    // Assuming we can navigate directly by clicking next multiple times
    expect(screen.getByText(/senior software engineer/i)).toBeInTheDocument();
  });

  it('should show all job details in preview', () => {
    render(
      <JobPosting
        initialData={mockJobData}
        mode="preview"
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText(/\$130,000.*\$170,000/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Save Draft Tests
  // ========================================================================

  it('should call onSaveDraft with form data', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    await user.type(screen.getByLabelText(/job title/i), 'Test Job');

    const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
    await user.click(saveDraftButton);

    expect(mockOnSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Job',
      })
    );
  });

  it('should allow saving draft at any step', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Save draft button should be available
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });

  // ========================================================================
  // Publish Tests
  // ========================================================================

  it('should call onPublish with complete job data', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        initialData={mockJobData}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    const publishButton = screen.getByRole('button', { name: /publish job/i });
    await user.click(publishButton);

    expect(mockOnPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Senior Software Engineer',
        status: 'active',
      })
    );
  });

  it('should validate all required fields before publish', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    const publishButton = screen.getByRole('button', { name: /publish job/i });
    await user.click(publishButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/please complete.*required fields/i)).toBeInTheDocument();
    });

    expect(mockOnPublish).not.toHaveBeenCalled();
  });

  // ========================================================================
  // Navigation Tests
  // ========================================================================

  it('should navigate between steps', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        initialData={mockJobData}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Should be on step 1
    expect(screen.getByText(/step 1/i)).toBeInTheDocument();

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/step 2/i)).toBeInTheDocument();
    });

    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    });
  });

  it('should preserve form data when navigating between steps', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    const titleInput = screen.getByLabelText(/job title/i);
    await user.type(titleInput, 'My Job Title');

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/step 2/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/job title/i)).toHaveValue('My Job Title');
    });
  });

  // ========================================================================
  // Cancel Tests
  // ========================================================================

  it('should call onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show confirmation dialog before canceling with unsaved changes', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Make some changes
    await user.type(screen.getByLabelText(/job title/i), 'Some title');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have accessible form labels', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    expect(screen.getByLabelText(/job title/i)).toHaveAccessibleName();
    expect(screen.getByLabelText(/location/i)).toHaveAccessibleName();
  });

  it('should support keyboard navigation', async () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    const titleInput = screen.getByLabelText(/job title/i);
    titleInput.focus();

    expect(titleInput).toHaveFocus();
  });

  it('should display validation errors accessibly', async () => {
    const user = userEvent.setup();

    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      const errorMessage = screen.getByText(/job title is required/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  // ========================================================================
  // Edge Cases Tests
  // ========================================================================

  it('should handle AI generation error gracefully', () => {
    render(
      <JobPosting
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
        generationError="Failed to generate description"
      />
    );

    expect(screen.getByText(/failed to generate description/i)).toBeInTheDocument();
  });

  it('should disable publish button during save', () => {
    render(
      <JobPosting
        initialData={mockJobData}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
        publishing={true}
      />
    );

    const publishButton = screen.getByRole('button', { name: /publishing/i });
    expect(publishButton).toBeDisabled();
  });

  it('should handle very long job descriptions', () => {
    const longDescription = 'A'.repeat(10000);
    const dataWithLongDescription = {
      ...mockJobData,
      description: longDescription,
    };

    render(
      <JobPosting
        initialData={dataWithLongDescription}
        onSaveDraft={mockOnSaveDraft}
        onPublish={mockOnPublish}
        onCancel={mockOnCancel}
        onGenerateDescription={mockOnGenerateDescription}
      />
    );

    // Should render without crashing
    expect(screen.getByRole('heading', { name: /create job posting/i })).toBeInTheDocument();
  });
});
