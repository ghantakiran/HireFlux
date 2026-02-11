/**
 * TemplatePreviewModal Component (Issue #24)
 *
 * Modal for previewing job template details:
 * - Full job description
 * - Requirements, responsibilities, skills lists
 * - Template metadata
 * - "Use This Template" action
 */

'use client';

import React, { useEffect } from 'react';
import { X, Briefcase, Users, Lock } from 'lucide-react';
import {
  JobTemplate,
  getCategoryLabel,
  getCategoryColor,
  formatUsageCount,
  getVisibilityLabel,
} from '@/lib/api/jobTemplates';

interface TemplatePreviewModalProps {
  template: JobTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: JobTemplate) => void;
}

export default function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !template) return null;

  const isPublic = template.visibility === 'public';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {template.name}
              </h2>
              <div className="flex items-center space-x-2">
                {/* Category Badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                    template.category
                  )}`}
                >
                  {getCategoryLabel(template.category)}
                </span>

                {/* Visibility Badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isPublic
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {isPublic ? (
                    <Users className="w-3 h-3 mr-1" />
                  ) : (
                    <Lock className="w-3 h-3 mr-1" />
                  )}
                  {getVisibilityLabel(template.visibility)}
                </span>

                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatUsageCount(template.usage_count)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Job Title */}
            <div>
              <div className="flex items-center text-gray-500 dark:text-gray-400 mb-2">
                <Briefcase className="w-4 h-4 mr-2" />
                <h3 className="text-sm font-medium uppercase tracking-wide">
                  Job Title
                </h3>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {template.title}
              </p>
            </div>

            {/* Job Details */}
            <div className="grid grid-cols-2 gap-4">
              {template.department && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Department
                  </h4>
                  <p className="text-gray-900 dark:text-gray-100">{template.department}</p>
                </div>
              )}
              {template.employment_type && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Employment Type
                  </h4>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">
                    {template.employment_type.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              {template.experience_level && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Experience Level
                  </h4>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">
                    {template.experience_level}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {template.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Description
                </h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {template.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {template.requirements && template.requirements.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Requirements
                </h3>
                <ul className="space-y-2">
                  {template.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                      <span className="text-gray-700 dark:text-gray-300">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Responsibilities */}
            {template.responsibilities && template.responsibilities.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Responsibilities
                </h3>
                <ul className="space-y-2">
                  {template.responsibilities.map((resp, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                      <span className="text-gray-700 dark:text-gray-300">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {template.skills && template.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onUseTemplate(template);
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
