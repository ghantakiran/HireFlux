/**
 * Application Tracking Dashboard Page (Issue #106)
 *
 * TDD Green Phase: Implementing the dashboard to pass E2E tests
 * Uses: ApplicationPipeline, AnalyticsChart, AISuggestionCard, EmptyState components
 */

'use client';

import { useState, useEffect } from 'react';
import { ApplicationPipeline, Application, PipelineStage } from '@/components/domain/ApplicationPipeline';
import { AnalyticsChart, ChartDataPoint } from '@/components/domain/AnalyticsChart';
import { AISuggestionCard, AISuggestion } from '@/components/domain/AISuggestionCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Clock,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Pipeline stages configuration
const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'new', label: 'New', color: 'gray' },
  { id: 'screening', label: 'Screening', color: 'blue' },
  { id: 'interview', label: 'Interview', color: 'purple' },
  { id: 'assessment', label: 'Assessment', color: 'purple' },
  { id: 'offer', label: 'Offer', color: 'green' },
  { id: 'hired', label: 'Hired', color: 'success' },
  { id: 'rejected', label: 'Rejected', color: 'red' },
  { id: 'withdrawn', label: 'Withdrawn', color: 'gray' },
];

// Sort options
type SortOption = 'newest' | 'oldest' | 'fitIndex' | 'company';

export default function ApplicationTrackingDashboardPage() {
  // State
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterStage, setFilterStage] = useState<string | 'all'>('all');

  // Analytics data
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    responseRate: 0,
    averageResponseTime: 0,
    interviewSuccessRate: 0,
  });

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);

  // Fetch applications on mount
  useEffect(() => {
    fetchApplications();
  }, []);

  // Filter and sort applications when dependencies change
  useEffect(() => {
    let filtered = [...applications];

    // Apply stage filter
    if (filterStage !== 'all') {
      filtered = filtered.filter((app) => app.stage === filterStage);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.appliedDate?.getTime() || 0) - (a.appliedDate?.getTime() || 0);
        case 'oldest':
          return (a.appliedDate?.getTime() || 0) - (b.appliedDate?.getTime() || 0);
        case 'fitIndex':
          return (b.fitIndex || 0) - (a.fitIndex || 0);
        case 'company':
          return a.company.localeCompare(b.company);
        default:
          return 0;
      }
    });

    setFilteredApplications(filtered);
  }, [applications, sortBy, filterStage]);

  // Fetch applications from API
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock API call - replace with actual API endpoint
      const mockApplications: Application[] = [
        {
          id: '1',
          jobTitle: 'Senior Frontend Engineer',
          company: 'TechCorp Inc.',
          candidateName: 'You',
          appliedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          stage: 'new',
          fitIndex: 87,
        },
        {
          id: '2',
          jobTitle: 'React Developer',
          company: 'StartupXYZ',
          candidateName: 'You',
          appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          stage: 'screening',
          fitIndex: 92,
        },
        {
          id: '3',
          jobTitle: 'Full Stack Engineer',
          company: 'BigCo',
          candidateName: 'You',
          appliedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          stage: 'interview',
          fitIndex: 78,
        },
        {
          id: '4',
          jobTitle: 'Frontend Developer',
          company: 'InnovateLab',
          candidateName: 'You',
          appliedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          stage: 'assessment',
          fitIndex: 85,
        },
        {
          id: '5',
          jobTitle: 'UI Engineer',
          company: 'DesignCo',
          candidateName: 'You',
          appliedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          stage: 'rejected',
          fitIndex: 65,
        },
      ];

      setApplications(mockApplications);

      // Generate mock analytics data
      const mockChartData: ChartDataPoint[] = [
        { label: 'Week 1', value: 3 },
        { label: 'Week 2', value: 5 },
        { label: 'Week 3', value: 8 },
        { label: 'Week 4', value: 7 },
        { label: 'Week 5', value: 10 },
        { label: 'Week 6', value: 12 },
      ];
      setChartData(mockChartData);

      // Calculate stats
      setStats({
        totalApplications: mockApplications.length,
        responseRate: 75,
        averageResponseTime: 3.5,
        interviewSuccessRate: 60,
      });

      // Mock AI suggestions
      const mockSuggestions: AISuggestion[] = [
        {
          id: 'sug-1',
          category: 'resume',
          title: 'Follow up on pending applications',
          description: 'You have 2 applications from over a week ago with no response.',
          reasoning: 'Following up shows interest and can increase response rates by 25%.',
          confidence: 0.85,
          impact: 'medium',
          metadata: {
            type: 'skill',
          },
        },
        {
          id: 'sug-2',
          category: 'resume',
          title: 'Update your resume for rejected applications',
          description: 'Your recent rejection may indicate a skills mismatch.',
          reasoning: 'Tailoring your resume for specific job requirements can improve match rates.',
          confidence: 0.72,
          impact: 'high',
          metadata: {
            type: 'profile',
          },
        },
      ];
      setAiSuggestions(mockSuggestions);

      setLoading(false);
    } catch (err) {
      setError('Failed to load applications. Please try again.');
      setLoading(false);
    }
  };

  // Handle application stage change
  const handleStageChange = async (applicationId: string, newStage: string) => {
    try {
      // Mock API call - replace with actual endpoint
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, stage: newStage } : app
        )
      );

      // Dispatch event for real-time update testing
      window.dispatchEvent(
        new CustomEvent('application-status-updated', {
          detail: { applicationId, newStage },
        })
      );
    } catch (err) {
      console.error('Failed to update application status:', err);
    }
  };

  // Handle application click
  const handleApplicationClick = (applicationId: string) => {
    // Navigate to application details or open modal
    console.log('Application clicked:', applicationId);
  };

  // Handle AI suggestion actions
  const handleAcceptSuggestion = (suggestionId: string) => {
    setAiSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    setAiSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-error">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error Loading Applications</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchApplications} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Application Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage all your job applications in one place
        </p>
      </div>

      {/* Analytics Section */}
      <div className="mb-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <div data-analytics-stats className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Total Applications
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.totalApplications}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Across {PIPELINE_STAGES.length} stages
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Response Rate
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.responseRate}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    +5% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Avg Response Time
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.averageResponseTime}d</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Industry avg: 5d
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Interview Success Rate
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.interviewSuccessRate}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Top 20% of users
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Applications Over Time</CardTitle>
                <CardDescription>Weekly application submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  data={chartData}
                  type="bar"
                  height={300}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="mt-4">
            <div className="space-y-4">
              {aiSuggestions.length > 0 ? (
                aiSuggestions.map((suggestion) => (
                  <AISuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No AI suggestions at this time. Keep applying!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Filters & Sort */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="fitIndex">Highest Fit Index</SelectItem>
            <SelectItem value="company">Company Name</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchApplications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Application Pipeline */}
      <ApplicationPipeline
        applications={filteredApplications}
        stages={PIPELINE_STAGES}
        onStageChange={handleStageChange}
        onApplicationClick={handleApplicationClick}
        showFitIndex
        showDate
        showCount
        loading={loading}
        emptyMessage="No applications yet. Start applying to jobs!"
      />
    </div>
  );
}
