/**
 * Employer Dashboard Component - Sprint 19-20 Week 39 Day 3
 *
 * Main dashboard for employer accounts showing:
 * - Overview statistics (active jobs, applications, quality metrics)
 * - Top performing jobs
 * - Applications by status (pipeline)
 * - Recent activity feed
 * - Quick actions
 *
 * Built using TDD approach - follows test specifications exactly
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  Plus,
  Search,
  Eye,
  Activity,
} from 'lucide-react';

// Types
interface DashboardStats {
  activeJobs: number;
  newApplicationsToday: number;
  totalApplications: number;
  avgCandidateQuality: number;
  avgTimeToFill: number;
}

interface ApplicationsByStatus {
  new: number;
  reviewing: number;
  interview: number;
  offer: number;
  hired: number;
  rejected: number;
}

interface TopJob {
  id: string;
  title: string;
  applications: number;
  views: number;
  postedDays: number;
}

interface ActivityItem {
  id: string;
  type: 'new_application' | 'status_change' | 'new_job';
  message: string;
  timestamp: string;
  actor: string;
}

interface Company {
  id: string;
  name: string;
  logo?: string;
}

interface DashboardData {
  company: Company;
  stats: DashboardStats;
  applicationsByStatus: ApplicationsByStatus;
  topJobs: TopJob[];
  recentActivity: ActivityItem[];
}

interface EmployerDashboardProps {
  data: DashboardData | null;
  loading?: boolean;
  error?: string;
  onPostJob: () => void;
  onViewApplications: () => void;
  onSearchCandidates: () => void;
  onRetry?: () => void;
}

export function EmployerDashboard({
  data,
  loading = false,
  error,
  onPostJob,
  onViewApplications,
  onSearchCandidates,
  onRetry,
}: EmployerDashboardProps) {
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-600">Loading dashboard...</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                role="status"
                aria-label="Loading stat"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <Activity className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry}>Try Again</Button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!data) {
    return null;
  }

  const hasNoJobs = data.stats.activeJobs === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.company.name}</h1>
              <p className="text-gray-600 mt-1">Welcome back! Here's your hiring overview.</p>
            </div>
            {data.company.logo && (
              <img
                src={data.company.logo}
                alt={`${data.company.name} logo`}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Button onClick={onPostJob} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Post New Job
          </Button>
          <Button onClick={onViewApplications} variant="outline" size="lg">
            <Eye className="w-5 h-5 mr-2" />
            View All Applications
          </Button>
          <Button onClick={onSearchCandidates} variant="outline" size="lg">
            <Search className="w-5 h-5 mr-2" />
            Search Candidates
          </Button>
        </div>

        {/* Empty State */}
        {hasNoJobs && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center mb-8">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Jobs</h2>
            <p className="text-gray-600 mb-6">Get started by posting your first job</p>
            <Button onClick={onPostJob} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Post Your First Job
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Jobs */}
          <div
            data-testid="active-jobs-stat"
            role="region"
            aria-label="Active jobs statistic"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.stats.activeJobs}</p>
            <p className="text-xs text-gray-500 mt-2">Currently hiring</p>
          </div>

          {/* New Applications */}
          <div
            data-testid="new-applications-stat"
            role="region"
            aria-label="New applications statistic"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">New Applications Today</p>
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.stats.newApplicationsToday}</p>
            <p className="text-xs text-gray-500 mt-2">Last 24 hours</p>
          </div>

          {/* Candidate Quality */}
          <div
            role="region"
            aria-label="Candidate quality statistic"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Candidate Quality</p>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.stats.avgCandidateQuality}</p>
            <p className="text-xs text-gray-500 mt-2">Average Fit Index</p>
          </div>

          {/* Time to Fill */}
          <div
            role="region"
            aria-label="Time to fill statistic"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Time to Fill</p>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.stats.avgTimeToFill} days</p>
            <p className="text-xs text-gray-500 mt-2">Average duration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performing Jobs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performing Jobs</h2>
            {data.topJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No jobs yet</p>
            ) : (
              <div className="space-y-4">
                {data.topJobs.map((job) => (
                  <div
                    key={job.id}
                    className="border-b border-gray-100 last:border-0 pb-4 last:pb-0"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{job.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{job.applications} applications</span>
                      <span>•</span>
                      <span>{job.views} views</span>
                      <span>•</span>
                      <span>{job.postedDays} days ago</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications by Status */}
          <div data-testid="applications-by-status" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Applications by Status</h2>
            <div className="space-y-3">
              {[
                { label: 'New', value: data.applicationsByStatus.new, color: 'bg-blue-500' },
                { label: 'Reviewing', value: data.applicationsByStatus.reviewing, color: 'bg-yellow-500' },
                { label: 'Interview', value: data.applicationsByStatus.interview, color: 'bg-purple-500' },
                { label: 'Offer', value: data.applicationsByStatus.offer, color: 'bg-green-500' },
                { label: 'Hired', value: data.applicationsByStatus.hired, color: 'bg-emerald-500' },
              ].map((status) => (
                <div key={status.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                    <span className="text-sm font-medium text-gray-700">{status.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {data.recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 border-b border-gray-100 last:border-0 pb-4 last:pb-0"
                >
                  <div className="flex-shrink-0">
                    <Activity className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{activity.actor}</span>
                      <span>•</span>
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
