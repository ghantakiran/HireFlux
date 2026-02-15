'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Briefcase,
  Calendar,
  BarChart3,
  Loader2,
  FileText,
  Zap,
} from 'lucide-react';
import { useApplicationStore } from '@/lib/stores/application-store';
import { EmptyState } from '@/components/ui/empty-state';

export default function AnalyticsPage() {
  const router = useRouter();
  const routerNav = useRouter();
  const { stats, isLoading, error, fetchStats, fetchApplications } =
    useApplicationStore();

  useEffect(() => {
    document.title = 'Analytics | HireFlux';
    fetchStats();
    fetchApplications(); // Fetch applications for additional analytics
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate additional metrics
  const totalActive =
    stats.by_status.saved +
    stats.by_status.applied +
    stats.by_status.interview +
    stats.by_status.offer;
  const applicationToInterviewRate =
    stats.by_status.applied > 0
      ? ((stats.by_status.interview / stats.by_status.applied) * 100).toFixed(1)
      : '0.0';
  const interviewToOfferRate =
    stats.by_status.interview > 0
      ? ((stats.by_status.offer / stats.by_status.interview) * 100).toFixed(1)
      : '0.0';

  // Check if user has no applications
  const hasNoApplications = stats.total_applications === 0;

  if (hasNoApplications && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/applications')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Application Analytics</h1>
          </div>
          <p className="text-muted-foreground">
            Track your job search performance and identify opportunities for improvement
          </p>
        </div>

        {/* Empty State */}
        <EmptyState
          icon={BarChart3}
          title="Not enough data yet"
          description="Start applying to jobs to see insights about your application success rate, response times, and trends."
          action={{
            label: 'Browse Jobs',
            onClick: () => routerNav.push('/dashboard/jobs'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/applications')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Applications
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Application Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          Track your job search performance and identify opportunities for improvement
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error Loading Analytics</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Applications */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <Badge variant="secondary">Total</Badge>
            </div>
            <div className="text-3xl font-bold mb-1">
              {stats.total_applications}
            </div>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-green-600" />
              <Badge
                variant="secondary"
                className={
                  stats.success_rate >= 15
                    ? 'bg-green-100 text-green-800'
                    : stats.success_rate >= 10
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {stats.success_rate >= 15 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {stats.success_rate >= 15
                  ? 'Great'
                  : stats.success_rate >= 10
                  ? 'Good'
                  : 'Improve'}
              </Badge>
            </div>
            <div className="text-3xl font-bold mb-1">
              {stats.success_rate.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>

        {/* Interviews */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-purple-600" />
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Active
              </Badge>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total_interviews}</div>
            <p className="text-sm text-muted-foreground">Total Interviews</p>
          </CardContent>
        </Card>

        {/* Offers */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-5 w-5 text-orange-600" />
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Offers
              </Badge>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total_offers}</div>
            <p className="text-sm text-muted-foreground">Total Offers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Conversion Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>
              Track your application progress through each stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Saved */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Saved</span>
                  </div>
                  <span className="font-bold">{stats.by_status.saved}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_status.saved / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Applied */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Applied</span>
                  </div>
                  <span className="font-bold">{stats.by_status.applied}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-orange-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_status.applied / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Interview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Interview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stats.by_status.interview}</span>
                    <Badge variant="secondary" className="text-xs">
                      {applicationToInterviewRate}% conversion
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_status.interview / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Offer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Offer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stats.by_status.offer}</span>
                    <Badge variant="secondary" className="text-xs">
                      {interviewToOfferRate}% conversion
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_status.offer / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Rejected */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Rejected</span>
                  </div>
                  <span className="font-bold">{stats.by_status.rejected}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_status.rejected / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Performance Indicators */}
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Applied to Interview Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Applied → Interview
                </span>
                <span className="font-bold text-lg">{applicationToInterviewRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    parseFloat(applicationToInterviewRate) >= 15
                      ? 'bg-green-600'
                      : parseFloat(applicationToInterviewRate) >= 10
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(parseFloat(applicationToInterviewRate) * 5, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Industry average: 10-20%
              </p>
            </div>

            {/* Interview to Offer Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Interview → Offer
                </span>
                <span className="font-bold text-lg">{interviewToOfferRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    parseFloat(interviewToOfferRate) >= 25
                      ? 'bg-green-600'
                      : parseFloat(interviewToOfferRate) >= 15
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(parseFloat(interviewToOfferRate) * 3, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Industry average: 20-30%
              </p>
            </div>

            {/* Overall Success Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Overall Success</span>
                <span className="font-bold text-lg">
                  {stats.success_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.success_rate >= 15
                      ? 'bg-green-600'
                      : stats.success_rate >= 10
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(stats.success_rate * 5, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: 10-20%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Application Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Application Methods</CardTitle>
            <CardDescription>
              Performance by application submission type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Manual */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Manual</span>
                  </div>
                  <span className="font-bold">{stats.by_mode.manual}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_mode.manual / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Apply Assist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Apply Assist</span>
                  </div>
                  <span className="font-bold">{stats.by_mode.apply_assist}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_mode.apply_assist / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Auto Apply */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Auto-Apply</span>
                  </div>
                  <span className="font-bold">{stats.by_mode.auto_apply}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (stats.by_mode.auto_apply / stats.total_applications) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
            <CardDescription>Average time to reach each stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avg Days to Interview */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Applied → Interview</span>
              </div>
              <div className="text-3xl font-bold">
                {stats.avg_days_to_interview
                  ? `${Math.round(stats.avg_days_to_interview)} days`
                  : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.avg_days_to_interview && stats.avg_days_to_interview <= 7
                  ? 'Great response time!'
                  : stats.avg_days_to_interview && stats.avg_days_to_interview <= 14
                  ? 'Good response time'
                  : 'Average response time'}
              </p>
            </div>

            {/* Avg Days to Offer */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-green-600" />
                <span className="font-medium">Interview → Offer</span>
              </div>
              <div className="text-3xl font-bold">
                {stats.avg_days_to_offer
                  ? `${Math.round(stats.avg_days_to_offer)} days`
                  : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.avg_days_to_offer && stats.avg_days_to_offer <= 14
                  ? 'Fast hiring process'
                  : stats.avg_days_to_offer && stats.avg_days_to_offer <= 30
                  ? 'Normal hiring timeline'
                  : 'Extended process'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
          <CardDescription>
            AI-powered suggestions to improve your job search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Low application rate insight */}
            {stats.total_applications < 10 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Increase Application Volume
                  </h4>
                  <p className="text-sm text-blue-700">
                    You've only applied to {stats.total_applications} positions. Consider
                    applying to 10-15 relevant positions per week to increase your chances
                    of success.
                  </p>
                </div>
              </div>
            )}

            {/* Low interview conversion */}
            {parseFloat(applicationToInterviewRate) < 10 &&
              stats.by_status.applied > 5 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 mb-1">
                      Improve Application Quality
                    </h4>
                    <p className="text-sm text-orange-700">
                      Your application-to-interview rate is {applicationToInterviewRate}%
                      (target: 10-20%). Try tailoring your resume and cover letter for
                      each position to better match the job requirements.
                    </p>
                  </div>
                </div>
              )}

            {/* Good performance */}
            {stats.success_rate >= 15 && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-1">
                    Excellent Performance!
                  </h4>
                  <p className="text-sm text-green-700">
                    Your success rate of {stats.success_rate.toFixed(1)}% is above
                    industry average. Keep up the great work with your targeted
                    applications!
                  </p>
                </div>
              </div>
            )}

            {/* No activity */}
            {stats.total_applications === 0 && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Briefcase className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Start Your Job Search
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">
                    You haven't started tracking applications yet. Browse our job matches
                    and start applying to positions that fit your profile.
                  </p>
                  <Button onClick={() => router.push('/dashboard/jobs')}>
                    Browse Jobs
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
