'use client';

/**
 * Resume Upload Step
 * Issue #142: Step 1 of mobile application flow
 *
 * Features:
 * - Three upload options (Camera, File, Existing)
 * - Camera capture with OCR
 * - File upload with validation
 * - Existing resume selection
 */

import React, { useState, useRef } from 'react';
import { Camera, Upload, FileText, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '../camera-capture';
import type { ApplicationData } from '../mobile-apply-modal';
import { getErrorMessage } from '@/lib/api-error-handler';

interface ResumeUploadStepProps {
  applicationData: ApplicationData;
  updateData: (updates: Partial<ApplicationData>) => void;
}

// Mock existing resumes (TODO: Replace with API call)
const MOCK_RESUMES = [
  {
    id: 'resume-001',
    name: 'Software Engineer Resume',
    updatedAt: '2026-01-10',
    url: '/resumes/resume-001.pdf',
  },
  {
    id: 'resume-002',
    name: 'Full Stack Developer Resume',
    updatedAt: '2026-01-05',
    url: '/resumes/resume-002.pdf',
  },
];

export function ResumeUploadStep({
  applicationData,
  updateData,
}: ResumeUploadStepProps) {
  const [uploadMode, setUploadMode] = useState<'options' | 'camera' | 'file' | 'existing'>('options');
  const [existingResumes] = useState(MOCK_RESUMES);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle camera capture
  const handleCameraCapture = (imageUrl: string) => {
    updateData({ resumeUrl: imageUrl });
    setUploadMode('options');
  };

  // Handle file upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file format. Please upload PDF or DOC files.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size exceeds 5MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create a mock upload (TODO: Replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create object URL for preview
      const fileUrl = URL.createObjectURL(file);

      updateData({
        resumeFile: file,
        resumeUrl: fileUrl,
      });

      setUploadMode('options');
    } catch (error: unknown) {
      setUploadError(getErrorMessage(error, 'Upload failed. Please try again.'));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle existing resume selection
  const handleResumeSelect = (resumeId: string) => {
    const resume = existingResumes.find((r) => r.id === resumeId);
    if (resume) {
      updateData({
        resumeId: resume.id,
        resumeUrl: resume.url,
      });
    }
  };

  // Handle retry after upload error
  const handleRetry = () => {
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div data-resume-upload className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upload Your Resume</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Choose how you'd like to provide your resume
        </p>
      </div>

      {/* Camera Capture Mode */}
      {uploadMode === 'camera' && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setUploadMode('options')}
        />
      )}

      {/* Upload Options */}
      {uploadMode === 'options' && (
        <>
          {/* Current Selection */}
          {(applicationData.resumeId || applicationData.resumeFile || applicationData.resumeUrl) && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900 dark:text-green-300" data-upload-success>
                    Resume selected
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 truncate" data-file-name>
                    {applicationData.resumeFile?.name ||
                      existingResumes.find((r) => r.id === applicationData.resumeId)?.name ||
                      'Captured from camera'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Options Grid */}
          <div className="space-y-3">
            {/* Camera Option */}
            <button
              data-upload-option="camera"
              onClick={() => setUploadMode('camera')}
              className="
                w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700
                hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                active:scale-[0.98]
                transition-all duration-200
                flex items-center gap-4
                min-h-[60px]
              "
            >
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Camera className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Take Photo</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use your camera to capture resume</p>
              </div>
            </button>

            {/* File Upload Option */}
            <button
              data-upload-option="file"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="
                w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700
                hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                active:scale-[0.98]
                transition-all duration-200
                flex items-center gap-4
                min-h-[60px]
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Upload className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Upload File</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">PDF, DOC, or DOCX (max 5MB)</p>
              </div>
            </button>

            {/* File Input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Existing Resume Option */}
            <button
              data-upload-option="existing"
              onClick={() => setUploadMode('existing')}
              className="
                w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700
                hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                active:scale-[0.98]
                transition-all duration-200
                flex items-center gap-4
                min-h-[60px]
              "
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Use Existing</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Choose from your saved resumes</p>
              </div>
            </button>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div data-upload-progress className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin text-blue-600">⏳</div>
                <p className="text-sm text-blue-900 dark:text-blue-300">Uploading resume...</p>
              </div>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div data-upload-error className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 dark:text-red-300 mb-2">{uploadError}</p>
              <Button
                data-retry-upload
                onClick={handleRetry}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 dark:text-red-400 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* File Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p data-supported-formats>
              <strong>Supported formats:</strong> PDF, DOC, DOCX
            </p>
            <p data-file-size-limit>
              <strong>Max file size:</strong> 5MB
            </p>
          </div>
        </>
      )}

      {/* Existing Resumes List */}
      {uploadMode === 'existing' && (
        <>
          <Button
            variant="ghost"
            onClick={() => setUploadMode('options')}
            className="mb-4"
          >
            ← Back to options
          </Button>

          {existingResumes.length > 0 ? (
            <div data-existing-resumes className="space-y-3">
              {existingResumes.map((resume) => (
                <button
                  key={resume.id}
                  data-resume-item
                  data-resume-id={resume.id}
                  data-selected={applicationData.resumeId === resume.id ? 'true' : 'false'}
                  onClick={() => handleResumeSelect(resume.id)}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all duration-200
                    text-left flex items-center gap-4 min-h-[72px]
                    ${
                      applicationData.resumeId === resume.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
                    }
                  `}
                >
                  <div
                    className={`
                      flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                      ${
                        applicationData.resumeId === resume.id
                          ? 'bg-blue-600'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }
                    `}
                  >
                    {applicationData.resumeId === resume.id ? (
                      <Check className="h-6 w-6 text-white" />
                    ) : (
                      <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {resume.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Updated {formatDate(resume.updatedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div data-empty-resumes className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No resumes found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload your first resume to get started
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
