/**
 * Test Page for JobPosting Component
 * Sprint 19-20 Week 39 Day 4
 *
 * Navigate to: http://localhost:3000/test/job-posting
 */

'use client';

import React, { useState } from 'react';
import { JobPosting, JobData } from '@/components/employer/JobPosting';

// Mock data for testing
const mockJobData: Partial<JobData> = {
  title: 'Senior Frontend Developer',
  department: 'Engineering',
  location: 'San Francisco, CA',
  locationType: 'hybrid',
  employmentType: 'full_time',
  experienceLevel: 'senior',
  salaryMin: 130000,
  salaryMax: 170000,
  salaryCurrency: 'USD',
  description: 'We are seeking a talented Senior Frontend Developer to join our growing team...',
  requirements: ['5+ years React experience', 'TypeScript proficiency', 'Team leadership'],
  responsibilities: ['Lead frontend architecture', 'Mentor junior developers', 'Code reviews'],
  skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS'],
  benefits: ['Health insurance', '401k matching', 'Remote flexibility', 'Learning budget'],
};

export default function JobPostingTestPage() {
  const [mode, setMode] = useState<'create' | 'edit' | 'preview'>('create');
  const [hasInitialData, setHasInitialData] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generationError, setGenerationError] = useState<string | undefined>();
  const [publishing, setPublishing] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Partial<JobData>[]>([]);

  const handleSaveDraft = (data: Partial<JobData>) => {
    console.log('Draft saved:', data);
    setSavedJobs(prev => [...prev, { ...data, status: 'draft' }]);
    alert(`Draft saved: ${data.title || 'Untitled Job'}`);
  };

  const handlePublish = (data: JobData) => {
    console.log('Publishing job:', data);
    setPublishing(true);

    // Simulate API call
    setTimeout(() => {
      setPublishing(false);
      setSavedJobs(prev => [...prev, { ...data, status: 'active' }]);
      alert(`Job published: ${data.title}`);
    }, 2000);
  };

  const handleCancel = () => {
    console.log('Cancelled');
    alert('Job posting cancelled');
  };

  const handleGenerateDescription = (data: { title: string; location: string; experienceLevel?: string }) => {
    console.log('Generating description for:', data);
    setGeneratingDescription(true);
    setGenerationError(undefined);

    // Simulate AI generation
    setTimeout(() => {
      setGeneratingDescription(false);
      alert('AI generation completed (simulated)');
    }, 3000);
  };

  const triggerGenerationError = () => {
    setGenerationError('Failed to generate job description. Please try again.');
    setTimeout(() => setGenerationError(undefined), 5000);
  };

  const initialData = hasInitialData ? mockJobData : {};

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800">
      {/* Test Controls */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Job Posting Test Page
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sprint 19-20 Week 39 Day 4 - TDD Implementation (30/37 tests passing)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                ✓ 30/37 tests passing (81%)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Saved jobs: {savedJobs.length}</p>
            </div>
          </div>

          {/* Mode Controls */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setMode('create')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Create Mode
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Edit Mode
            </button>
            <button
              onClick={() => setMode('preview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'preview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Preview Mode
            </button>
          </div>

          {/* Data Controls */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setHasInitialData(!hasInitialData)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasInitialData
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {hasInitialData ? '✓ With Initial Data' : 'No Initial Data'}
            </button>
            <button
              onClick={() => setGeneratingDescription(!generatingDescription)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                generatingDescription
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {generatingDescription ? 'Generating...' : 'Simulate AI Generation'}
            </button>
            <button
              onClick={triggerGenerationError}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-200 text-red-700 hover:bg-red-300 transition-colors"
            >
              Trigger AI Error
            </button>
            <button
              onClick={() => setPublishing(!publishing)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                publishing
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {publishing ? 'Publishing...' : 'Simulate Publishing'}
            </button>
          </div>

          {/* Info Panel */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Current State:</strong> Mode={mode}, InitialData={hasInitialData ? 'Yes' : 'No'},
              Generating={generatingDescription ? 'Yes' : 'No'}, Publishing={publishing ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* JobPosting Component */}
      <JobPosting
        key={`${mode}-${hasInitialData}`}
        initialData={initialData}
        mode={mode}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onCancel={handleCancel}
        onGenerateDescription={handleGenerateDescription}
        generatingDescription={generatingDescription}
        generationError={generationError}
        publishing={publishing}
      />

      {/* Saved Jobs List */}
      {savedJobs.length > 0 && (
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Saved Jobs ({savedJobs.length})</h2>
          <div className="space-y-2">
            {savedJobs.map((job, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{job.title || 'Untitled'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{job.location} • {job.employmentType?.replace('_', '-')}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    job.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}>
                    {job.status || 'draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
