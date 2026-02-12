/**
 * Assessments List Page - Employer Portal
 * Sprint 17-18 Phase 4
 *
 * BDD Test: tests/e2e/assessment-features.spec.ts
 * Satisfies: "should create a new technical screening assessment"
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, Search, MoreVertical, ClipboardCheck } from 'lucide-react';
import { EmptyState } from '@/components/domain/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { assessmentApi } from '@/lib/api';

interface Assessment {
  id: string;
  title: string;
  description: string;
  assessment_type: 'screening' | 'technical' | 'behavioral' | 'culture_fit';
  status: 'draft' | 'published' | 'archived';
  total_attempts: number;
  avg_score: number;
  pass_rate: number;
  time_limit_minutes: number;
  created_at: string;
}

export default function AssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchAssessments();
  }, [statusFilter, typeFilter]);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.assessment_type = typeFilter;
      }

      const response = await assessmentApi.listAssessments(params);

      if (response.data.success) {
        setAssessments(response.data.data || []);
      } else {
        setError('Failed to load assessments');
      }
    } catch (error: any) {
      console.error('Failed to fetch assessments:', error);
      setError(error.response?.data?.error?.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = () => {
    router.push('/employer/assessments/new');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      screening: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      technical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      behavioral: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      culture_fit: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Assessments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage skills assessments for your candidates
          </p>
        </div>
        <Button
          onClick={handleCreateAssessment}
          data-testid="create-assessment-button"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Assessment
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-assessments"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="screening">Screening</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="behavioral">Behavioral</SelectItem>
              <SelectItem value="culture_fit">Culture Fit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Error loading assessments</p>
          <p className="text-sm mt-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAssessments} className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Assessments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-2"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading assessments...</p>
          </div>
        ) : assessments.length === 0 && !error ? (
          <EmptyState
            title="No assessments yet"
            description="Create skills assessments to evaluate candidates for your open positions."
            icon={<ClipboardCheck className="h-12 w-12 text-muted-foreground" />}
            actionLabel="Create Assessment"
            onAction={() => router.push('/employer/assessments/new')}
          />
        ) : (
          assessments.map((assessment) => (
            <div
              key={assessment.id}
              data-testid="assessment-item"
              className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/employer/assessments/${assessment.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {assessment.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        assessment.status
                      )}`}
                    >
                      {assessment.status}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(
                        assessment.assessment_type
                      )}`}
                    >
                      {assessment.assessment_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{assessment.description}</p>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <span>{assessment.total_attempts} attempts</span>
                    <span>Avg Score: {assessment.avg_score}%</span>
                    <span>Pass Rate: {assessment.pass_rate}%</span>
                    <span>{assessment.time_limit_minutes} min</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/employer/assessments/${assessment.id}/edit`)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/employer/assessments/${assessment.id}/analytics`)}>
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/employer/assessments/${assessment.id}/clone`)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 dark:text-red-400">
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
