/**
 * TemplateCard Component (Issue #24)
 *
 * Displays a job template in card format with:
 * - Template name and job title
 * - Category and visibility badges
 * - Usage count
 * - Preview and Use Template buttons
 * - Edit/Delete actions for company templates
 */

'use client';

import React from 'react';
import { Eye, Briefcase, Lock, Users, Pencil, Trash2 } from 'lucide-react';
import {
  JobTemplate,
  getCategoryLabel,
  getCategoryColor,
  formatUsageCount,
  getVisibilityLabel,
  canEditTemplate,
  canDeleteTemplate,
} from '@/lib/api/jobTemplates';

interface TemplateCardProps {
  template: JobTemplate;
  companyId: string;
  onPreview: (template: JobTemplate) => void;
  onUse: (template: JobTemplate) => void;
  onEdit?: (template: JobTemplate) => void;
  onDelete?: (template: JobTemplate) => void;
}

function TemplateCard({
  template,
  companyId,
  onPreview,
  onUse,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const isEditable = canEditTemplate(template, companyId);
  const isDeletable = canDeleteTemplate(template, companyId);
  const isPublic = template.visibility === 'public';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {template.name}
          </h3>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Briefcase className="w-4 h-4 mr-1" />
            <span>{template.title}</span>
          </div>
        </div>

        {/* Edit/Delete buttons for company templates */}
        {(isEditable || isDeletable) && (
          <div className="flex items-center space-x-1 ml-2">
            {isEditable && onEdit && (
              <button
                onClick={() => onEdit(template)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="Edit template"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {isDeletable && onDelete && (
              <button
                onClick={() => onDelete(template)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Delete template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center space-x-2 mb-4">
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
      </div>

      {/* Description Preview */}
      {template.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span>{formatUsageCount(template.usage_count)}</span>
        {template.department && (
          <span className="text-gray-400">• {template.department}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPreview(template)}
          className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </button>
        <button
          onClick={() => onUse(template)}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Use Template
        </button>
      </div>
    </div>
  );
}

const MemoizedTemplateCard = React.memo(TemplateCard);
MemoizedTemplateCard.displayName = 'TemplateCard';
export default MemoizedTemplateCard;
