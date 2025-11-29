/**
 * Onboarding Step 1: Company Profile (Issue #112)
 *
 * Simplified company profile setup for onboarding
 * - Minimal required fields
 * - Auto-save functionality
 * - Skip option
 * - Leverages company profile form from Issue #113
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Save, SkipForward } from 'lucide-react';

interface CompanyProfileStepProps {
  onContinue: (data: any) => void;
  onSkip: () => void;
  onSaveAndExit: () => void;
  savedData: any;
}

export default function CompanyProfileStep({
  onContinue,
  onSkip,
  onSaveAndExit,
  savedData,
}: CompanyProfileStepProps) {
  const [formData, setFormData] = useState({
    name: savedData?.companyProfile?.name || '',
    industry: savedData?.companyProfile?.industry || '',
    size: savedData?.companyProfile?.size || '',
    description: savedData?.companyProfile?.description || '',
    website: savedData?.companyProfile?.website || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) {
        onSaveAndExit();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Company name is required';
    if (!formData.industry) newErrors.industry = 'Industry is required';
    if (!formData.size) newErrors.size = 'Company size is required';
    if (!formData.description) newErrors.description = 'Description is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onContinue(formData);
  };

  return (
    <div>
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h2 data-step-heading className="text-2xl font-bold text-gray-900">
            Tell us about your company
          </h2>
        </div>
        <p className="text-gray-600">
          This information will help job seekers learn about your company and culture.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            data-company-name-input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="TechCorp Inc"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            id="industry"
            data-industry-select
            value={formData.industry}
            onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.industry ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select industry</option>
            <option data-industry-option="Technology" value="Technology">Technology</option>
            <option value="Finance">Finance</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Education">Education</option>
            <option value="Retail">Retail</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Other">Other</option>
          </select>
          {errors.industry && (
            <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
          )}
        </div>

        {/* Company Size */}
        <div>
          <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
            Company Size <span className="text-red-500">*</span>
          </label>
          <select
            id="size"
            data-company-size-select
            value={formData.size}
            onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.size ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select company size</option>
            <option data-size-option="1-10 employees" value="1-10 employees">1-10 employees</option>
            <option data-size-option="11-50 employees" value="11-50 employees">11-50 employees</option>
            <option data-size-option="51-200 employees" value="51-200 employees">51-200 employees</option>
            <option value="201-500 employees">201-500 employees</option>
            <option value="501+ employees">501+ employees</option>
          </select>
          {errors.size && (
            <p className="mt-1 text-sm text-red-600">{errors.size}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Company Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            data-description-textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Tell job seekers about your company mission, culture, and what makes you unique..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/500 characters
          </p>
        </div>

        {/* Website (Optional) */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            id="website"
            type="url"
            data-website-input
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://yourcompany.com"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            data-continue-button
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Continue
          </button>

          <button
            type="button"
            data-skip-button
            onClick={onSkip}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <SkipForward className="w-5 h-5" />
            Skip
          </button>

          <button
            type="button"
            data-save-exit-button
            onClick={onSaveAndExit}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save & Exit
          </button>
        </div>
      </form>
    </div>
  );
}
