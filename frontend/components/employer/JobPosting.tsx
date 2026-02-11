/**
 * JobPosting Component - Sprint 19-20 Week 39 Day 4
 *
 * Multi-step job posting form with AI assistance
 * - Step 1: Basic Information
 * - Step 2: Job Description (AI generation)
 * - Step 3: Requirements & Skills
 * - Step 4: Preview & Publish
 *
 * Built using TDD approach - follows test specifications exactly
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Sparkles,
  Save,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
} from 'lucide-react';

// Types
export interface JobData {
  title: string;
  department: string;
  location: string;
  locationType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  benefits: string[];
  status?: 'draft' | 'active';
}

interface JobPostingProps {
  initialData?: Partial<JobData>;
  mode?: 'create' | 'edit' | 'preview';
  onSaveDraft: (data: Partial<JobData>) => void;
  onPublish: (data: JobData) => void;
  onCancel: () => void;
  onGenerateDescription: (data: { title: string; location: string; experienceLevel?: string }) => void;
  generatingDescription?: boolean;
  generationError?: string;
  publishing?: boolean;
}

export function JobPosting({
  initialData = {},
  mode = 'create',
  onSaveDraft,
  onPublish,
  onCancel,
  onGenerateDescription,
  generatingDescription = false,
  generationError,
  publishing = false,
}: JobPostingProps) {
  // Determine initial step based on mode and data completeness
  // - Edit mode: always start on step 1 (to allow editing)
  // - Preview mode: always start on step 4 (review only)
  // - Create mode with complete data: start on step 4 (review/publish)
  // - Create mode without complete data: start on step 1
  const hasCompleteData = initialData?.title && initialData?.location && initialData?.description;
  const initialStep =
    mode === 'edit' ? 1 :
    mode === 'preview' ? 4 :
    hasCompleteData ? 4 :
    1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState<Partial<JobData>>({
    title: '',
    department: '',
    location: '',
    locationType: 'hybrid',
    employmentType: 'full_time',
    experienceLevel: 'mid',
    salaryMin: 0,
    salaryMax: 0,
    salaryCurrency: 'USD',
    description: '',
    requirements: [],
    responsibilities: [],
    skills: [],
    benefits: [],
    ...initialData,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Track form changes
  useEffect(() => {
    if (JSON.stringify(formData) !== JSON.stringify(initialData)) {
      setHasUnsavedChanges(true);
    }
  }, [formData, initialData]);

  // Update form data
  const updateFormData = (field: keyof JobData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validation
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title?.trim()) {
        errors.title = 'Job title is required';
      }
      if (!formData.location?.trim()) {
        errors.location = 'Location is required';
      }
      if (formData.salaryMin && formData.salaryMax && formData.salaryMin >= formData.salaryMax) {
        errors.salaryMax = 'Maximum salary must be greater than minimum salary';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title?.trim()) errors.title = 'Job title is required';
    if (!formData.location?.trim()) errors.location = 'Location is required';
    if (!formData.description?.trim()) errors.description = 'Job description is required';

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setValidationErrors({ ...errors, general: 'Please complete all required fields before publishing' });
      return false;
    }

    return true;
  };

  // Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Actions
  const handleSaveDraft = () => {
    onSaveDraft(formData);
    setHasUnsavedChanges(false);
  };

  const handlePublish = () => {
    if (validateAll()) {
      onPublish({ ...formData, status: 'active' } as JobData);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  const handleGenerateDescription = () => {
    onGenerateDescription({
      title: formData.title || '',
      location: formData.location || '',
      experienceLevel: formData.experienceLevel,
    });
  };

  // Array field helpers
  const addArrayItem = (field: 'requirements' | 'responsibilities' | 'skills' | 'benefits', value: string) => {
    if (value.trim()) {
      const currentArray = formData[field] || [];
      updateFormData(field, [...currentArray, value.trim()]);
    }
  };

  const removeArrayItem = (field: 'requirements' | 'responsibilities' | 'skills' | 'benefits', index: number) => {
    const currentArray = formData[field] || [];
    updateFormData(field, currentArray.filter((_, i) => i !== index));
  };

  // Preview mode
  if (mode === 'preview') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{formData.title}</h1>
          <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-400 mb-6">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {formData.location}
            </span>
            <span className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {formData.locationType}
            </span>
            {formData.salaryMin && formData.salaryMax && (
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                ${formData.salaryMin.toLocaleString()} - ${formData.salaryMax.toLocaleString()} {formData.salaryCurrency}
              </span>
            )}
          </div>

          <div className="prose max-w-none">
            <h2>Description</h2>
            <p>{formData.description}</p>

            {formData.requirements && formData.requirements.length > 0 && (
              <>
                <h2>Requirements</h2>
                <ul>
                  {formData.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </>
            )}

            {formData.skills && formData.skills.length > 0 && (
              <>
                <h2>Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'edit' ? 'Edit Job Posting' : 'Create Job Posting'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Step {currentStep} of 4 • {['Basic Information', 'Job Description', 'Requirements & Skills', 'Review'][currentStep - 1]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      step < currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {/* Global AI Generation Loading Indicator */}
          {generatingDescription && currentStep !== 2 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-3 border-blue-600 border-t-transparent"></div>
                <p className="text-blue-900 dark:text-blue-300 font-medium">Generating job description with AI...</p>
              </div>
            </div>
          )}

          {/* Global AI Generation Error Indicator */}
          {generationError && currentStep !== 2 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400 text-sm">
              {generationError}
            </div>
          )}

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                  placeholder="e.g. Senior Software Engineer"
                />
                {validationErrors.title && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  value={formData.department}
                  onChange={(e) => updateFormData('department', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location *
                </label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                  placeholder="e.g. San Francisco, CA"
                />
                {validationErrors.location && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.location}</p>
                )}
              </div>

              <div>
                <label htmlFor="locationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workplace Type
                </label>
                <select
                  id="locationType"
                  value={formData.locationType}
                  onChange={(e) => updateFormData('locationType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>

              <div>
                <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employment Type
                </label>
                <select
                  id="employmentType"
                  value={formData.employmentType}
                  onChange={(e) => updateFormData('employmentType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Experience Level
                </label>
                <select
                  id="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={(e) => updateFormData('experienceLevel', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Salary
                  </label>
                  <input
                    id="salaryMin"
                    type="number"
                    value={formData.salaryMin || ''}
                    onChange={(e) => updateFormData('salaryMin', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                    placeholder="100000"
                  />
                </div>
                <div>
                  <label htmlFor="salaryMax" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Salary
                  </label>
                  <input
                    id="salaryMax"
                    type="number"
                    value={formData.salaryMax || ''}
                    onChange={(e) => updateFormData('salaryMax', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                    placeholder="150000"
                  />
                  {validationErrors.salaryMax && (
                    <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.salaryMax}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Job Description */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">AI-Powered Description</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      Let AI generate a professional job description based on your job details
                    </p>
                    <Button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={generatingDescription || !formData.title}
                      variant="outline"
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {generatingDescription ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>
                </div>
              </div>

              {generationError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
                  {generationError}
                </div>
              )}

              {generatingDescription && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Generating job description...</p>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Describe the role, responsibilities, and what makes this opportunity unique..."
                />
                {validationErrors.description && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Requirements & Skills */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <ArrayInput
                label="Requirements"
                items={formData.requirements || []}
                onAdd={(value) => addArrayItem('requirements', value)}
                onRemove={(index) => removeArrayItem('requirements', index)}
                placeholder="e.g. 5+ years of experience with Python"
              />

              <ArrayInput
                label="Responsibilities"
                items={formData.responsibilities || []}
                onAdd={(value) => addArrayItem('responsibilities', value)}
                onRemove={(index) => removeArrayItem('responsibilities', index)}
                placeholder="e.g. Lead technical architecture decisions"
              />

              <ArrayInput
                label="Skills"
                items={formData.skills || []}
                onAdd={(value) => addArrayItem('skills', value)}
                onRemove={(index) => removeArrayItem('skills', index)}
                placeholder="e.g. Python, React, AWS"
              />

              <ArrayInput
                label="Benefits"
                items={formData.benefits || []}
                onAdd={(value) => addArrayItem('benefits', value)}
                onRemove={(index) => removeArrayItem('benefits', index)}
                placeholder="e.g. Health insurance, 401k matching"
              />
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Review Your Job Posting</h2>

              <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formData.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{formData.department}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {formData.location} • {formData.locationType}
                  </span>
                  <span>{formData.employmentType?.replace('_', '-')}</span>
                  <span>{formData.experienceLevel} level</span>
                  {formData.salaryMin && formData.salaryMax && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${formData.salaryMin.toLocaleString()} - ${formData.salaryMax.toLocaleString()}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{formData.description}</p>
                </div>

                {formData.requirements && formData.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Requirements</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                      {formData.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {formData.skills && formData.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {validationErrors.general && (
                <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-red-700 dark:text-red-400">
                  {validationErrors.general}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            onClick={handleCancel}
            variant="ghost"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSaveDraft}
              variant="outline"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>

            {currentStep > 1 && (
              <Button
                type="button"
                onClick={handleBack}
                variant="outline"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
              >
                <Eye className="w-4 h-4 mr-2" />
                {publishing ? 'Publishing...' : 'Publish Job'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Unsaved Changes</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You have unsaved changes. Are you sure you want to cancel?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                variant="outline"
              >
                Continue Editing
              </Button>
              <Button
                type="button"
                onClick={confirmCancel}
                variant="destructive"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for array inputs
interface ArrayInputProps {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}

function ArrayInput({ label, items, onAdd, onRemove, placeholder }: ArrayInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
          placeholder={placeholder}
        />
        <Button
          type="button"
          onClick={handleAdd}
          variant="outline"
          size="sm"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700"
            >
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-red-600 dark:text-red-400 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
