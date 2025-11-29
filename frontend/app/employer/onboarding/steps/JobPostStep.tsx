/**
 * Onboarding Step 2: First Job Post (Issue #112)
 *
 * Guided first job posting with AI assistance
 * - Pre-filled company info from step 1
 * - AI job description generator
 * - Publish or save draft options
 * - Skip option
 */

'use client';

import React, { useState } from 'react';
import { Briefcase, Sparkles, Save, SkipForward } from 'lucide-react';

interface JobPostStepProps {
  onContinue: (data: any) => void;
  onSkip: () => void;
  onSaveAndExit: () => void;
  savedData: any;
}

export default function JobPostStep({
  onContinue,
  onSkip,
  onSaveAndExit,
  savedData,
}: JobPostStepProps) {
  const [formData, setFormData] = useState({
    title: savedData?.firstJob?.title || '',
    department: savedData?.firstJob?.department || '',
    location: savedData?.firstJob?.location || '',
    type: savedData?.firstJob?.type || 'Full-time',
    description: savedData?.firstJob?.description || '',
    companyName: savedData?.companyProfile?.name || '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const generatedDescription = `Join ${formData.companyName || 'our team'} as a ${formData.title}!

About the Role:
We're looking for an experienced ${formData.title} to join our ${formData.department} team. In this role, you'll work on exciting projects and collaborate with talented professionals.

Responsibilities:
• Lead ${formData.department} initiatives
• Collaborate with cross-functional teams
• Drive innovation and excellence
• Contribute to company growth

Requirements:
• 3+ years of relevant experience
• Strong communication skills
• Problem-solving mindset
• Team player attitude

Benefits:
• Competitive salary
• Health insurance
• Remote work options
• Professional development`;

    setFormData(prev => ({ ...prev, description: generatedDescription }));
    setIsGenerating(false);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = 'Job title is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.location) newErrors.location = 'Location is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onContinue({ ...formData, status: 'published' });
  };

  const handleSaveDraft = () => {
    onContinue({ ...formData, status: 'draft' });
  };

  return (
    <div>
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-6 h-6 text-blue-600" />
          <h2 data-step-heading className="text-2xl font-bold text-gray-900">
            Post your first job
          </h2>
        </div>
        <p className="text-gray-600">
          Let's create your first job posting. We'll help you write a great job description.
        </p>
      </div>

      {/* Pre-filled Company Info */}
      {formData.companyName && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Company info pre-filled from your profile: <strong>{formData.companyName}</strong>
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handlePublish} className="space-y-6">
        {/* Job Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            data-job-title-input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Senior Software Engineer"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        {/* Department & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <input
              id="department"
              type="text"
              data-department-input
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.department ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Engineering"
            />
            {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              id="location"
              type="text"
              data-location-input
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="San Francisco, CA (Remote)"
            />
            {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
          </div>
        </div>

        {/* Job Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Job Type
          </label>
          <select
            id="type"
            data-job-type-select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>

        {/* AI Generate Button */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Job Description
            </label>
            <button
              type="button"
              data-ai-generate-button
              onClick={handleAIGenerate}
              disabled={isGenerating || !formData.title}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
          <textarea
            data-description-textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the role, responsibilities, requirements, and benefits..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            data-publish-job-button
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Publish Job
          </button>

          <button
            type="button"
            data-save-draft-button
            onClick={handleSaveDraft}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Draft
          </button>

          <button
            type="button"
            data-skip-button
            onClick={onSkip}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <SkipForward className="w-5 h-5" />
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
