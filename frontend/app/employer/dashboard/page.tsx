/**
 * Employer Dashboard Page - Sprint 19-20 Week 40 Day 4 - Issue #22
 *
 * Comprehensive dashboard with:
 * - Welcome greeting with contextual subtitle
 * - "Your Next Steps" action cards
 * - Collapsible metrics overview
 * - Applications pipeline chart
 * - Top performing jobs table
 * - Recent activity feed
 * - Quick actions
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  PlusCircle,
  Inbox,
  Search,
  BarChart3,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface DashboardStats {
  active_jobs: number;
  new_applications_today: number;
  avg_fit_index?: number;
  avg_time_to_fill?: number;
  total_applications: number;
  applications_by_status: Array<{ status: string; count: number }>;
  top_jobs: Array<{
    job_id: string;
    job_title: string;
    total_applications: number;
    avg_candidate_fit?: number;
  }>;
}

interface PipelineData {
  new: number;
  screening: number;
  interview: number;
  offer: number;
  hired: number;
  rejected: number;
  total: number;
}

interface RecentActivity {
  events: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    metadata: Record<string, any>;
  }>;
  total: number;
  has_more: boolean;
}

export default function EmployerDashboardPage() {
  // Note: Page title set via metadata in layout.tsx for WCAG 2.1 AA compliance (Issue #148)

  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/employer/login');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch stats
      const statsRes = await fetch('/api/v1/employers/dashboard/stats', { headers });
      if (!statsRes.ok) throw new Error('Failed to fetch dashboard stats');
      const statsData = await statsRes.json();
      setStats(statsData.success ? statsData.data : statsData);

      // Fetch pipeline (if stats endpoint doesn't include it)
      const pipelineRes = await fetch('/api/v1/employers/dashboard/pipeline', { headers });
      if (pipelineRes.ok) {
        const pipelineData = await pipelineRes.json();
        setPipeline(pipelineData.success ? pipelineData.data : pipelineData);
      }

      // Fetch recent activity
      const activityRes = await fetch('/api/v1/employers/dashboard/activity?limit=10', { headers });
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData.success ? activityData.data : activityData);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    // Set document title for WCAG 2.1 AA compliance (Issue #148)
    document.title = 'Employer Dashboard | HireFlux';

    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Build contextual subtitle
  const getSubtitle = () => {
    const parts: string[] = [];
    if (stats?.new_applications_today && stats.new_applications_today > 0) {
      parts.push(`${stats.new_applications_today} new application${stats.new_applications_today === 1 ? '' : 's'} today`);
    }
    if (stats?.active_jobs && stats.active_jobs > 0) {
      parts.push(`${stats.active_jobs} active job${stats.active_jobs === 1 ? '' : 's'}`);
    }
    return parts.length > 0 ? parts.join(' \u00B7 ') : "Here's your recruitment overview.";
  };

  // Build action cards based on state
  const getActionCards = () => {
    const cards: Array<{
      title: string;
      description: string;
      href: string;
      borderColor: string;
      icon: React.ReactNode;
      cta: string;
    }> = [];

    if (stats?.new_applications_today && stats.new_applications_today > 0) {
      cards.push({
        title: 'Review Applications',
        description: `${stats.new_applications_today} new application${stats.new_applications_today === 1 ? '' : 's'} waiting for review`,
        href: '/employer/applications',
        borderColor: 'border-l-blue-500',
        icon: <Inbox className="w-5 h-5 text-blue-600" />,
        cta: 'Review Now',
      });
    }

    if (!stats?.active_jobs || stats.active_jobs === 0) {
      cards.push({
        title: 'Post Your First Job',
        description: 'Create an AI-powered job description in minutes',
        href: '/employer/jobs/new',
        borderColor: 'border-l-green-500',
        icon: <PlusCircle className="w-5 h-5 text-green-600" />,
        cta: 'Post a Job',
      });
    } else {
      cards.push({
        title: 'Search Candidates',
        description: 'Find qualified candidates for your open roles',
        href: '/employer/candidates',
        borderColor: 'border-l-purple-500',
        icon: <Search className="w-5 h-5 text-purple-600" />,
        cta: 'Search Now',
      });
    }

    if (cards.length < 3 && stats?.active_jobs && stats.active_jobs > 0) {
      cards.push({
        title: 'Post Another Job',
        description: 'Expand your reach with a new listing',
        href: '/employer/jobs/new',
        borderColor: 'border-l-yellow-500',
        icon: <PlusCircle className="w-5 h-5 text-yellow-600" />,
        cta: 'Create Listing',
      });
    }

    return cards;
  };

  // Loading skeleton
  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <Skeleton className="h-6 w-96" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchDashboardData} className="gap-2" aria-label="Retry loading dashboard">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const actionCards = getActionCards();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
              <p className="text-gray-600 mt-1">{getSubtitle()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Updated {Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)}s ago
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Your Next Steps */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Next Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className={`bg-white rounded-lg shadow border-l-4 ${card.borderColor} p-5 hover:shadow-md transition-shadow group`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{card.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{card.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                    <span className="inline-block mt-3 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      {card.cta} &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Collapsible Metrics Overview */}
        <div className="bg-white rounded-lg shadow mb-8">
          <button
            onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
            className="w-full flex items-center justify-between p-4 text-left"
            aria-expanded={showDetailedMetrics}
          >
            <span className="text-sm font-semibold text-gray-700">Metrics Overview</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                showDetailedMetrics ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showDetailedMetrics && (
            <div className="px-4 pb-6 border-t border-gray-100 pt-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Jobs */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.active_jobs ?? 0}
                  </p>
                </div>

                {/* New Applications Today */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">New Applications Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.new_applications_today ?? 0}
                  </p>
                </div>

                {/* Avg Fit Index */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Avg Fit Index</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.avg_fit_index
                      ? `${stats.avg_fit_index.toFixed(1)}`
                      : '--'}
                  </p>
                  {stats?.avg_fit_index && (
                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                  )}
                </div>

                {/* Avg Time to Fill */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Avg Time to Fill</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.avg_time_to_fill
                      ? `${Math.round(stats.avg_time_to_fill)}`
                      : '--'}
                  </p>
                  {stats?.avg_time_to_fill && (
                    <p className="text-xs text-gray-500 mt-1">Days</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline & Top Jobs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applications Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Applications Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.applications_by_status && stats.applications_by_status.length > 0 ? (
                <div className="space-y-3">
                  {stats.applications_by_status.map((stage) => (
                    <div key={stage.status} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{stage.status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${(stage.count / (stats.total_applications || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-8 text-right">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No applications yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/employer/jobs/new')}
                    className="mt-3"
                  >
                    Post Your First Job
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performing Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.top_jobs && stats.top_jobs.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_jobs.map((job) => (
                    <div
                      key={job.job_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(`/employer/jobs/${job.job_id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{job.job_title}</p>
                        <p className="text-xs text-gray-500">
                          {job.total_applications} applications
                        </p>
                      </div>
                      {job.avg_candidate_fit && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-purple-600">
                            {job.avg_candidate_fit.toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500">Fit</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No active jobs yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/employer/jobs/new')}
                    className="mt-3"
                  >
                    Post a Job
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity?.events && activity.events.length > 0 ? (
              <div className="space-y-3">
                {activity.events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {activity.has_more && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/employer/activity')}
                    className="w-full"
                  >
                    View All Activity
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Button
                data-nav-company-profile
                variant="outline"
                className="justify-start h-auto py-4 bg-white hover:bg-blue-50"
                onClick={() => router.push('/employer/company-profile')}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium">Company Profile</span>
                  </div>
                  <p className="text-xs text-gray-600">Manage company info</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4 bg-white hover:bg-blue-50"
                onClick={() => router.push('/employer/jobs/new')}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Post a Job</span>
                  </div>
                  <p className="text-xs text-gray-600">Create a new job posting</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4 bg-white hover:bg-blue-50"
                onClick={() => router.push('/employer/applications')}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Inbox className="w-4 h-4 text-green-600" />
                    <span className="font-medium">View Applications</span>
                  </div>
                  <p className="text-xs text-gray-600">Review candidate applications</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4 bg-white hover:bg-blue-50"
                onClick={() => router.push('/employer/candidates')}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Search Candidates</span>
                  </div>
                  <p className="text-xs text-gray-600">Find qualified candidates</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4 bg-white hover:bg-blue-50"
                onClick={() => router.push('/employer/analytics')}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">Analytics</span>
                  </div>
                  <p className="text-xs text-gray-600">View detailed metrics</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
