/**
 * Job Templates Library Page (Issue #24)
 *
 * Main template library page with:
 * - Grid/list view of templates
 * - Filters (category, visibility, search)
 * - Preview modal
 * - Create template action
 * - Use template action
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Grid3x3, List, Search, FileText } from 'lucide-react';
import {
  listJobTemplates,
  deleteJobTemplate,
  createJobFromTemplate,
  JobTemplate,
  TemplateCategory,
  TemplateVisibility,
  getCategoryOptions,
  TemplateError,
} from '@/lib/api/jobTemplates';
import { EmptyState } from '@/components/domain/EmptyState';
import { toast } from 'sonner';
import TemplateCard from '@/components/employer/TemplateCard';
import TemplatePreviewModal from '@/components/employer/TemplatePreviewModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TemplatesPage() {
  const router = useRouter();

  // State
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | ''>('');
  const [visibilityFilter, setVisibilityFilter] = useState<TemplateVisibility | 'all'>('all');

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState<JobTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Delete template dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<JobTemplate | null>(null);

  // Company ID (from user context - simplified for now)
  const [companyId] = useState('current-company-id'); // TODO: Get from auth context

  // Set page metadata
  useEffect(() => {
    document.title = 'Job Templates | HireFlux';
  }, []);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, visibilityFilter]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (visibilityFilter !== 'all') filters.visibility = visibilityFilter;

      const response = await listJobTemplates(filters);
      setTemplates(response.templates);
    } catch (err) {
      const error = err as TemplateError;
      setError(error.detail || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.title.toLowerCase().includes(query) ||
      (template.description && template.description.toLowerCase().includes(query))
    );
  });

  // Handle preview
  function handlePreview(template: JobTemplate) {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  }

  // Handle use template
  async function handleUseTemplate(template: JobTemplate) {
    try {
      const response = await createJobFromTemplate(template.id);
      // Redirect to job creation page with template data
      // For now, store in sessionStorage and redirect
      sessionStorage.setItem('templateData', JSON.stringify(response.template_data));
      toast.success('Template created');
      router.push('/employer/jobs/new');
    } catch (err) {
      const error = err as TemplateError;
      toast.error('Failed to update template. Please try again.');
    }
  }

  // Handle edit template
  function handleEdit(template: JobTemplate) {
    // TODO: Navigate to edit template page
    router.push(`/employer/templates/${template.id}/edit`);
  }

  // Handle delete template
  function handleDeleteClick(template: JobTemplate) {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!templateToDelete) return;

    try {
      await deleteJobTemplate(templateToDelete.id);
      // Refresh templates list
      await fetchTemplates();
      toast.success('Template deleted');
    } catch (err) {
      const error = err as TemplateError;
      toast.error('Failed to update template. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Templates</h1>
              <p className="mt-1 text-sm text-gray-500">
                Browse and use templates to quickly create job postings
              </p>
            </div>
            <button
              onClick={() => router.push('/employer/templates/new')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Categories</option>
                {getCategoryOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Visibility Filter */}
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as TemplateVisibility | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Templates</option>
                <option value="public">Public Templates</option>
                <option value="private">My Templates</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${
                    viewMode === 'grid'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  } transition-colors rounded-l-lg`}
                  title="Grid view"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${
                    viewMode === 'list'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  } transition-colors rounded-r-lg border-l border-gray-300`}
                  title="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="flex space-x-2 mb-4">
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-10 flex-1 bg-gray-200 rounded"></div>
                  <div className="h-10 flex-1 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchTemplates}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTemplates.length === 0 && (
          <EmptyState
            title="No templates yet"
            description="Create reusable job description templates for faster posting."
            icon={<FileText className="h-12 w-12 text-muted-foreground" />}
            actionLabel="Create Template"
            onAction={() => router.push('/employer/templates/new')}
          />
        )}

        {/* Templates Grid */}
        {!loading && !error && filteredTemplates.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                companyId={companyId}
                onPreview={handlePreview}
                onUse={handleUseTemplate}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && filteredTemplates.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewTemplate(null);
        }}
        onUseTemplate={handleUseTemplate}
      />

      {/* Delete Template Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{templateToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
