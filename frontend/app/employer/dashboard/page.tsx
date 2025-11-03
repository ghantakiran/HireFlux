'use client';

/**
 * Employer Dashboard Page
 *
 * Displays comprehensive analytics and metrics for employer accounts:
 * - Job posting statistics
 * - Application pipeline metrics
 * - Recent activity feed
 * - Team activity overview
 * - Top performing jobs
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Types matching backend schemas
interface DashboardStats {
  active_jobs: number;
  total_jobs_posted: number;
  total_applications: number;
  new_applications_today: number;
  new_applications_this_week: number;
  applications_by_status: Array<{
    status: string;
    count: number;
  }>;
  top_jobs: Array<{
    job_id: string;
    job_title: string;
    total_applications: number;
    new_applications_24h: number;
    avg_candidate_fit: number | null;
  }>;
  avg_time_to_first_application_hours: number | null;
  avg_candidate_quality: number | null;
  jobs_posted_this_month: number;
  candidate_views_this_month: number;
  max_active_jobs: number;
  max_candidate_views: number;
}

interface PipelineMetrics {
  total_applicants: number;
  interviewed_count: number;
  offered_count: number;
  hired_count: number;
  rejected_count: number;
  application_to_interview_rate: number;
  interview_to_offer_rate: number;
  offer_acceptance_rate: number;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  actor_name: string | null;
  job_title: string | null;
  candidate_name: string | null;
  timestamp: string;
}

interface RecentActivity {
  events: ActivityEvent[];
  total_count: number;
}

export default function EmployerDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineMetrics | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch dashboard stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/employers/dashboard/stats`, {
        headers,
      });

      if (statsRes.status === 401) {
        router.push('/login');
        return;
      }

      if (!statsRes.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }

      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch pipeline metrics
      const pipelineRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/employers/dashboard/pipeline`, {
        headers,
      });

      if (pipelineRes.ok) {
        const pipelineData = await pipelineRes.json();
        setPipeline(pipelineData);
      }

      // Fetch recent activity
      const activityRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/employers/dashboard/activity?limit=10`, {
        headers,
      });

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">HireFlux Employer</h1>
            <nav className="flex gap-6">
              <a href="/employer/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                Dashboard
              </a>
              <a href="/employer/candidates" className="text-gray-700 hover:text-blue-600 font-medium">
                Candidate Search
              </a>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employer Dashboard</h1>
          <p className="text-gray-600">Overview of your hiring activity and performance metrics</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Jobs"
            value={stats.active_jobs}
            subtitle={`${stats.jobs_posted_this_month} posted this month`}
            icon="💼"
            color="blue"
          />
          <MetricCard
            title="Total Applications"
            value={stats.total_applications}
            subtitle={`${stats.new_applications_today} today`}
            icon="📝"
            color="green"
          />
          <MetricCard
            title="New This Week"
            value={stats.new_applications_this_week}
            subtitle="Applications received"
            icon="📊"
            color="purple"
          />
          <MetricCard
            title="Plan Usage"
            value={`${stats.jobs_posted_this_month}/${stats.max_active_jobs}`}
            subtitle="Jobs this month"
            icon="📈"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Pipeline Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Pipeline</h2>
            {stats.applications_by_status.length > 0 ? (
              <div className="space-y-3">
                {stats.applications_by_status.map((status) => (
                  <div key={status.status} className="flex items-center">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {status.status}
                        </span>
                        <span className="text-sm text-gray-600">{status.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(status.count / stats.total_applications) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No applications yet</p>
            )}
          </div>

          {/* Conversion Metrics */}
          {pipeline && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversion Rates</h2>
              <div className="space-y-4">
                <ConversionMetric
                  label="Application → Interview"
                  rate={pipeline.application_to_interview_rate}
                />
                <ConversionMetric
                  label="Interview → Offer"
                  rate={pipeline.interview_to_offer_rate}
                />
                <ConversionMetric
                  label="Offer → Hire"
                  rate={pipeline.offer_acceptance_rate}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Jobs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Jobs</h2>
            {stats.top_jobs.length > 0 ? (
              <div className="space-y-3">
                {stats.top_jobs.map((job) => (
                  <div key={job.job_id} className="border-b border-gray-200 pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{job.job_title}</h3>
                        <p className="text-sm text-gray-600">
                          {job.total_applications} total applications
                        </p>
                      </div>
                      {job.new_applications_24h > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          +{job.new_applications_24h} today
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No jobs posted yet</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {activity && activity.events.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activity.events.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">
                        {event.event_type === 'job_posted' ? '💼' : '📧'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      {event.description && (
                        <p className="text-sm text-gray-600">{event.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

interface ConversionMetricProps {
  label: string;
  rate: number;
}

function ConversionMetric({ label, rate }: ConversionMetricProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{rate.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(rate, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
