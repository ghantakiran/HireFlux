'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Avatar } from '@/components/ui/optimized-image';
import { NoActivityEmptyState } from '@/components/ui/empty-state';

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
type Tab = 'Overview' | 'Analytics' | 'Activity' | 'Charts' | 'Benchmarks' | 'Success Metrics';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('last_30_days');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [healthScoreExpanded, setHealthScoreExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Set document title for WCAG 2.1 AA compliance (Issue #148)
  // Client-side workaround needed because parent DashboardLayout is a client component
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
      // Create download
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-export-${new Date().toISOString()}.json`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          {/* Skeleton loaders */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4 animate-pulse" data-testid="skeleton-loader">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Dashboard</h2>
            <p className="text-red-700 mb-4">{error}</p>
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          <div className="text-center" data-testid="empty-state">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No applications yet</h2>
            <p className="text-gray-600 mb-6">Start applying to jobs to see your analytics</p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Track your job search progress</p>
            </div>
            <div data-tour="quick-actions" className="flex items-center gap-3">
              <span className="text-sm text-gray-500" data-testid="last-updated">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto" role="tablist">
            {(['Overview', 'Analytics', 'Activity', 'Charts', 'Benchmarks', 'Success Metrics'] as Tab[]).map(
              (tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          data-testid="mobile-menu"
          onClick={() => setShowMobileMenu(false)}
        >
          <div className="bg-white w-64 h-full shadow-xl" role="navigation">
            {/* Navigation content */}
            <div className="p-4">
              <h3 className="font-semibold mb-4">Navigation</h3>
              {/* Add navigation links */}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div id="dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Overview</h2>

            {/* Quick Stats Cards */}
            <div data-tour="stats-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow" data-testid="stat-applications-week">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Applications this week</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {data.applications_this_week}
                    </p>
                  </div>
                  <Briefcase className="w-10 h-10 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow" data-testid="stat-interviews-week">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Interviews this week</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {data.interviews_this_week}
                    </p>
                  </div>
                  <Calendar className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow" data-testid="stat-offers-pending">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending offers</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{data.offers_pending}</p>
                  </div>
                  <Gift className="w-10 h-10 text-purple-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow" data-testid="stat-new-matches">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">New matches</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {data.new_matches_count}
                    </p>
                  </div>
                  <Star className="w-10 h-10 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Health Score Widget */}
            <div
              className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all ${
                healthScoreExpanded ? 'ring-2 ring-blue-500' : ''
              }`}
              data-testid="health-score"
              onClick={() => setHealthScoreExpanded(!healthScoreExpanded)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Job Search Health Score</h3>
                <HelpCircle className="w-5 h-5 text-gray-400" data-testid="help-icon" />
              </div>

              <div className="flex items-center gap-6">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center ${getHealthColor(
                    data.health_score.overall_score
                  )}`}
                >
                  <span className="text-3xl font-bold" data-testid="score-value">
                    {Math.round(data.health_score.overall_score)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-semibold text-gray-900 capitalize">
                    {data.health_score.level.replace('_', ' ')}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Your job search is performing {data.health_score.level.replace('_', ' ').toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Health Score Components (Expanded) */}
              {healthScoreExpanded && (
                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Activity Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.activity_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(data.health_score.activity_score)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Quality Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.quality_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(data.health_score.quality_score)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Response Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.response_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(data.health_score.response_score)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Success Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-600 h-2 rounded-full"
                          style={{ width: `${data.health_score.success_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(data.health_score.success_score)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Statistics */}
            <div className="bg-white p-6 rounded-lg shadow" data-testid="pipeline-stats">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Pipeline</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {data.pipeline_stats.total_applications}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Response Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {data.pipeline_stats.response_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Interview Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {data.pipeline_stats.interview_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Offer Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {data.pipeline_stats.offer_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Anomaly Alerts */}
            {data.anomalies && data.anomalies.length > 0 && (
              <div
                className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg"
                data-testid="anomalies-section"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-900">
                    {data.anomalies.length} anomal{data.anomalies.length === 1 ? 'y' : 'ies'}{' '}
                    detected
                  </h3>
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>

                <div className="space-y-3">
                  {data.anomalies.map((anomaly, index) => (
                    <div
                      key={index}
                      className="bg-white p-4 rounded border border-yellow-200"
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
                          <p className="font-semibold text-gray-900">{anomaly.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                          <p className="text-sm text-blue-600 mt-2">
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
            <div data-tour="recent-applications" className="bg-white p-6 rounded-lg shadow" data-testid="activity-timeline">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {data.recent_activities && data.recent_activities.length > 0 ? (
                  data.recent_activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                      data-testid="activity-item"
                    >
                      <Avatar
                        src="/images/placeholders/avatar.svg"
                        alt="User avatar"
                        size={40}
                        data-testid="avatar"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-2" data-testid="timestamp">
                          {new Date(activity.timestamp).toLocaleString()}
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
                <div data-tour="job-matches" className="bg-white p-6 rounded-lg shadow" data-testid="recommendations-section">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
                  <div className="space-y-3">
                    {data.health_score.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg"
                        data-testid="recommendation-item"
                      >
                        <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-900">{rec}</p>
                          <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Take Action →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === 'Analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Detailed Analytics</h2>
            <p className="text-gray-600">Detailed analytics view coming soon...</p>
          </div>
        )}

        {activeTab === 'Activity' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Activity Timeline</h2>
            <p className="text-gray-600">Full activity timeline coming soon...</p>
          </div>
        )}

        {activeTab === 'Charts' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Charts</h2>
            <div className="bg-white p-6 rounded-lg shadow" data-testid="trends-chart">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Trends</h3>
              <p className="text-gray-500">Chart visualization coming soon...</p>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-sm text-gray-600">Applications</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-sm text-gray-600">Responses</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Benchmarks' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Peer Comparison</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Average</h3>
              <p className="text-gray-600 mb-4">Your Performance</p>
              <p className="text-gray-500">Benchmarking data coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'Success Metrics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Success Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.pipeline_stats.total_applications}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Responses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.pipeline_stats.in_review +
                    data.pipeline_stats.phone_screen +
                    data.pipeline_stats.technical_interview +
                    data.pipeline_stats.onsite_interview +
                    data.pipeline_stats.final_interview}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Interviews</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.pipeline_stats.phone_screen +
                    data.pipeline_stats.technical_interview +
                    data.pipeline_stats.onsite_interview +
                    data.pipeline_stats.final_interview}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Offers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.pipeline_stats.offer}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
