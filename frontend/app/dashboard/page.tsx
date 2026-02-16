'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { analyticsApi } from '@/lib/api';
import { useTourTrigger } from '@/lib/tours/useTourTrigger';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  HelpCircle,
  AlertTriangle,
  Activity,
  Target,
  Users,
  Award,
  Calendar,
  Briefcase,
  MessageSquare,
  Gift,
  Star,
  ChevronDown,
  Search,
  Video,
} from 'lucide-react';
import { Avatar } from '@/components/ui/optimized-image';
import { NoActivityEmptyState } from '@/components/ui/empty-state';
import { formatDateTime, downloadFile } from '@/lib/utils';
import { getHealthScoreColor } from '@/lib/score-colors';
import { StatCard } from '@/components/ui/stat-card';

// Types
interface HealthScore {
  overall_score: number;
  level: string;
  activity_score: number;
  quality_score: number;
  response_score: number;
  success_score: number;
  recommendations: string[];
  strengths: string[];
  areas_for_improvement: string[];
  components: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
}

interface PipelineStats {
  total_applications: number;
  saved: number;
  applied: number;
  in_review: number;
  phone_screen: number;
  technical_interview: number;
  onsite_interview: number;
  final_interview: number;
  offer: number;
  rejected: number;
  withdrawn: number;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
}

interface DashboardData {
  health_score: HealthScore;
  pipeline_stats: PipelineStats;
  applications_this_week: number;
  interviews_this_week: number;
  offers_pending: number;
  new_matches_count: number;
  recent_activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata: any;
  }>;
  anomalies: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    detected_at: string;
  }>;
}

type TimeRange = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'all_time';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('last_30_days');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [healthScoreExpanded, setHealthScoreExpanded] = useState(false);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);

  // Set document title for WCAG 2.1 AA compliance (Issue #148)
  useEffect(() => {
    document.title = 'Dashboard | HireFlux';
  }, []);

  // Auto-start dashboard tour on first visit
  useTourTrigger('dashboard');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsApi.getDashboardOverview();
      setData(response.data.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleExport = async () => {
    try {
      const response = await analyticsApi.exportDashboardData(timeRange);
      downloadFile(JSON.stringify(response.data.data, null, 2), `dashboard-export-${new Date().toISOString()}.json`, 'application/json');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 animate-pulse" data-testid="skeleton-loader">
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">Unable to Load Dashboard</h2>
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              aria-label="Retry loading dashboard"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>
          <div className="text-center" data-testid="empty-state">
            <Target className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No applications yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Start applying to jobs to see your analytics</p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build action cards based on user state
  const actionCards: Array<{
    title: string;
    description: string;
    href: string;
    borderColor: string;
    icon: React.ReactNode;
    cta: string;
  }> = [];

  if (data.new_matches_count > 0) {
    actionCards.push({
      title: 'Review New Matches',
      description: `${data.new_matches_count} new high-fit roles found for you`,
      href: '/jobs',
      borderColor: 'border-l-blue-500',
      icon: <Search className="w-5 h-5 text-blue-600" />,
      cta: 'View Matches',
    });
  }

  if (data.interviews_this_week > 0) {
    actionCards.push({
      title: 'Prepare for Interviews',
      description: `${data.interviews_this_week} interview${data.interviews_this_week === 1 ? '' : 's'} scheduled this week`,
      href: '/dashboard',
      borderColor: 'border-l-green-500',
      icon: <Video className="w-5 h-5 text-green-600" />,
      cta: 'Start Prep',
    });
  }

  if (data.offers_pending > 0) {
    actionCards.push({
      title: 'Review Pending Offers',
      description: `${data.offers_pending} offer${data.offers_pending === 1 ? '' : 's'} awaiting your response`,
      href: '/dashboard/applications',
      borderColor: 'border-l-purple-500',
      icon: <Gift className="w-5 h-5 text-purple-600" />,
      cta: 'View Offers',
    });
  }

  if (actionCards.length === 0) {
    actionCards.push({
      title: 'Start Applying',
      description: 'Browse matched jobs and submit your first applications',
      href: '/jobs',
      borderColor: 'border-l-yellow-500',
      icon: <Target className="w-5 h-5 text-yellow-600" />,
      cta: 'Find Jobs',
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome back!</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {data.applications_this_week > 0
                  ? `${data.applications_this_week} applications sent since last week`
                  : 'Track your job search progress'}
              </p>
            </div>
            <div data-tour="quick-actions" className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400" data-testid="last-updated">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2"
                title="Export"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="mt-4 flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="all_time">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Your Next Steps */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Your Next Steps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actionCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`bg-white dark:bg-gray-900 rounded-lg shadow border-l-4 ${card.borderColor} p-5 hover:shadow-md transition-shadow group`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{card.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{card.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.description}</p>
                      <span className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700">
                        {card.cta} &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Health Score + Pipeline Summary (2-col) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Score Widget */}
            <div
              className={`bg-white dark:bg-gray-900 p-6 rounded-lg shadow cursor-pointer transition-all ${
                healthScoreExpanded ? 'ring-2 ring-blue-500' : ''
              }`}
              data-testid="health-score"
              tabIndex={0}
              role="button"
              aria-expanded={healthScoreExpanded}
              onClick={() => setHealthScoreExpanded(!healthScoreExpanded)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHealthScoreExpanded(!healthScoreExpanded); } }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Job Search Health Score</h3>
                <HelpCircle className="w-5 h-5 text-gray-400" data-testid="help-icon" />
              </div>

              <div className="flex items-center gap-6">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center ${getHealthScoreColor(
                    data.health_score.overall_score
                  )}`}
                >
                  <span className="text-3xl font-bold" data-testid="score-value">
                    {Math.round(data.health_score.overall_score)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {data.health_score.level.replace('_', ' ')}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Your job search is performing {data.health_score.level.replace('_', ' ').toLowerCase()}
                  </p>
                </div>
              </div>

              {healthScoreExpanded && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.activity_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(data.health_score.activity_score)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.quality_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(data.health_score.quality_score)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.response_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(data.health_score.response_score)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Success Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-yellow-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.success_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(data.health_score.success_score)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Summary */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow" data-testid="pipeline-stats">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Application Pipeline</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {data.pipeline_stats.total_applications}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Response Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {data.pipeline_stats.response_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Interview Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {data.pipeline_stats.interview_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Offer Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {data.pipeline_stats.offer_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Detailed Metrics */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
            <button
              onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
              className="w-full flex items-center justify-between p-4 text-left"
              aria-expanded={showDetailedMetrics}
            >
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">View Detailed Metrics</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  showDetailedMetrics ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showDetailedMetrics && (
              <div className="px-4 pb-6 border-t border-gray-100 dark:border-gray-800 pt-4 animate-fade-in">
                {/* Quick Stats Cards */}
                <div data-tour="stats-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard layout="icon-right" icon={Briefcase} iconColor="blue" label="Applications this week" value={data.applications_this_week} data-testid="stat-applications-week" />
                  <StatCard layout="icon-right" icon={Calendar} iconColor="green" label="Interviews this week" value={data.interviews_this_week} data-testid="stat-interviews-week" />
                  <StatCard layout="icon-right" icon={Gift} iconColor="purple" label="Pending offers" value={data.offers_pending} data-testid="stat-offers-pending" />
                  <StatCard layout="icon-right" icon={Star} iconColor="yellow" label="New matches" value={data.new_matches_count} data-testid="stat-new-matches" />
                </div>

                {/* Full Pipeline Breakdown */}
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pipeline Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Saved', value: data.pipeline_stats.saved },
                    { label: 'Applied', value: data.pipeline_stats.applied },
                    { label: 'In Review', value: data.pipeline_stats.in_review },
                    { label: 'Phone Screen', value: data.pipeline_stats.phone_screen },
                    { label: 'Technical', value: data.pipeline_stats.technical_interview },
                    { label: 'Onsite', value: data.pipeline_stats.onsite_interview },
                    { label: 'Final', value: data.pipeline_stats.final_interview },
                    { label: 'Offer', value: data.pipeline_stats.offer },
                    { label: 'Rejected', value: data.pipeline_stats.rejected },
                    { label: 'Withdrawn', value: data.pipeline_stats.withdrawn },
                  ].map((stage) => (
                    <div key={stage.label} className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stage.label}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{stage.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Anomaly Alerts */}
          {data.anomalies && data.anomalies.length > 0 && (
            <div
              className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-lg"
              data-testid="anomalies-section"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300">
                  {data.anomalies.length} anomal{data.anomalies.length === 1 ? 'y' : 'ies'}{' '}
                  detected
                </h3>
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>

              <div className="space-y-3">
                {data.anomalies.map((anomaly, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-900 p-4 rounded border border-yellow-200 dark:border-yellow-800"
                    data-testid="anomaly-card"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          anomaly.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : anomaly.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        data-testid="severity-badge"
                      >
                        {anomaly.severity}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{anomaly.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{anomaly.description}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                          <span className="font-medium">Recommendation:</span> {anomaly.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div data-tour="recent-applications" className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow" data-testid="activity-timeline">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {data.recent_activities && data.recent_activities.length > 0 ? (
                data.recent_activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    data-testid="activity-item"
                  >
                    <Avatar
                      src="/images/placeholders/avatar.svg"
                      alt="User avatar"
                      size={40}
                      data-testid="avatar"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{activity.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2" data-testid="timestamp">
                        {formatDateTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <NoActivityEmptyState />
              )}
            </div>
          </div>

          {/* Recommendations */}
          {data.health_score.recommendations &&
            data.health_score.recommendations.length > 0 && (
              <div data-tour="job-matches" className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow" data-testid="recommendations-section">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recommendations</h3>
                <div className="space-y-3">
                  {data.health_score.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                      data-testid="recommendation-item"
                    >
                      <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-gray-100">{rec}</p>
                        <button className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                          Take Action &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
