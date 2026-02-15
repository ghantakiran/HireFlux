/**
 * AI Suggestions & Recommendations Page (Issue #109)
 *
 * TDD Green Phase: Implementing the page to pass 50+ E2E tests
 * Uses: AISuggestionCard, AnalyticsChart components
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AISuggestionCard, AISuggestion } from '@/components/domain/AISuggestionCard';
import { EmptyState } from '@/components/ui/empty-state';
import { AnalyticsChart, ChartDataPoint } from '@/components/domain/AnalyticsChart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { titleCase } from '@/lib/utils';
import {
  Lightbulb,
  TrendingUp,
  Target,
  Briefcase,
  FileText,
  Award,
  Filter,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

// Types
type SuggestionCategory = 'all' | 'skills' | 'experience' | 'profile' | 'resume' | 'jobs';
type SortOption = 'priority' | 'confidence' | 'impact' | 'newest';
type FilterDifficulty = 'all' | 'easy' | 'medium' | 'hard';
type FilterImpact = 'all' | 'low' | 'medium' | 'high';

interface SkillGap {
  id: string;
  skill: string;
  demand: number; // 0-100
  timeToLearn: string; // e.g., "2-4 weeks"
  resources: Array<{
    name: string;
    url: string;
    type: 'course' | 'tutorial' | 'documentation';
  }>;
  jobsRequiring: number;
}

interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  fitIndex: number; // 0-100
  fitBreakdown: {
    skills: number;
    experience: number;
    location: number;
    salary: number;
    culture: number;
  };
  whyRecommended: string;
  closingSoon: boolean;
}

interface ProfileImprovement {
  date: string;
  score: number; // 0-100
  changeDescription?: string;
}

export default function AISuggestionsPage() {
  const router = useRouter();

  // State - Suggestions
  const [allSuggestions, setAllSuggestions] = useState<AISuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // State - Filters & Sort
  const [activeCategory, setActiveCategory] = useState<SuggestionCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [filterDifficulty, setFilterDifficulty] = useState<FilterDifficulty>('all');
  const [filterImpact, setFilterImpact] = useState<FilterImpact>('all');

  // State - Profile & Analytics
  const [profileStrength, setProfileStrength] = useState(0);
  const [completedSuggestionsCount, setCompletedSuggestionsCount] = useState(0);
  const [improvementHistory, setImprovementHistory] = useState<ProfileImprovement[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // State - Skill Gap & Job Recommendations
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [jobRecommendations, setJobRecommendations] = useState<JobRecommendation[]>([]);

  // State - Undo
  const [recentlyRejected, setRecentlyRejected] = useState<AISuggestion | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch data on mount
  useEffect(() => {
    document.title = 'AI Suggestions | HireFlux';
    fetchSuggestions();
  }, []);

  // Filter and sort suggestions when dependencies change
  useEffect(() => {
    let filtered = [...allSuggestions];

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter((s) => {
        // Map suggestion categories
        if (activeCategory === 'resume') return s.category === 'resume';
        if (activeCategory === 'jobs') return s.category === 'job-match';
        if (activeCategory === 'profile') return s.category === 'cover-letter' || s.category === 'interview';
        // Default category mappings for other types
        return true;
      });
    }

    // Filter by difficulty
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter((s) => {
        const difficulty = s.metadata?.difficulty || 'medium';
        return difficulty === filterDifficulty;
      });
    }

    // Filter by impact
    if (filterImpact !== 'all') {
      filtered = filtered.filter((s) => s.impact === filterImpact);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          // Priority formula: Impact (40%) + Confidence (30%) + Ease (20%) + Urgency (10%)
          const priorityA = calculatePriority(a);
          const priorityB = calculatePriority(b);
          return priorityB - priorityA;
        case 'confidence':
          return b.confidence - a.confidence;
        case 'impact':
          const impactValues = { low: 1, medium: 2, high: 3 };
          return impactValues[b.impact] - impactValues[a.impact];
        case 'newest':
          return (b.metadata?.createdAt || 0) - (a.metadata?.createdAt || 0);
        default:
          return 0;
      }
    });

    setFilteredSuggestions(filtered);
  }, [allSuggestions, activeCategory, sortBy, filterDifficulty, filterImpact]);

  // Calculate priority score
  const calculatePriority = (suggestion: AISuggestion): number => {
    const impactWeights = { low: 25, sligh: 50, medium: 75, high: 100 };
    const impactScore = impactWeights[suggestion.impact] || 50;
    const confidenceScore = suggestion.confidence * 100;
    const easeScore = getEaseScore(suggestion.metadata?.difficulty);
    const urgencyScore = suggestion.metadata?.urgent ? 100 : 50;

    return (
      impactScore * 0.4 +
      confidenceScore * 0.3 +
      easeScore * 0.2 +
      urgencyScore * 0.1
    );
  };

  const getEaseScore = (difficulty?: string): number => {
    if (difficulty === 'easy') return 100;
    if (difficulty === 'medium') return 60;
    if (difficulty === 'hard') return 30;
    return 60;
  };

  // Fetch suggestions from API
  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock API call - replace with actual endpoint
      const mockSuggestions: AISuggestion[] = [
        // Skills Suggestions
        {
          id: 'sug-skill-1',
          category: 'resume',
          title: 'Add TypeScript to your skills',
          description: 'TypeScript is required by 78% of React developer jobs in your target market.',
          reasoning: 'Based on analysis of 1,247 similar profiles, adding TypeScript increases match rate by 35%.',
          confidence: 0.92,
          impact: 'high',
          metadata: {
            type: 'skill',
            difficulty: 'easy',
            estimatedTime: '5 minutes',
            urgent: false,
            createdAt: Date.now() - 1000000,
          },
        },
        {
          id: 'sug-skill-2',
          category: 'resume',
          title: 'Add GraphQL to complement your REST API experience',
          description: 'GraphQL is increasingly popular in modern full-stack roles.',
          reasoning: 'Jobs requiring both REST and GraphQL offer 20% higher salaries on average.',
          confidence: 0.75,
          impact: 'medium',
          metadata: {
            type: 'skill',
            difficulty: 'medium',
            estimatedTime: '10 minutes',
            urgent: false,
            createdAt: Date.now() - 2000000,
          },
        },
        {
          id: 'sug-skill-3',
          category: 'resume',
          title: 'Add Docker for DevOps competency',
          description: 'Docker containerization is mentioned in 65% of senior engineering roles.',
          reasoning: 'Demonstrates infrastructure knowledge valued by scaling startups.',
          confidence: 0.68,
          impact: 'medium',
          metadata: {
            type: 'skill',
            difficulty: 'easy',
            estimatedTime: '5 minutes',
            urgent: false,
            createdAt: Date.now() - 3000000,
          },
        },

        // Experience Suggestions
        {
          id: 'sug-exp-1',
          category: 'resume',
          title: 'Quantify your impact at TechCorp',
          description: 'Add metrics to your "Led frontend team" achievement.',
          reasoning: 'Quantified achievements increase recruiter engagement by 45%. Example: "Led team of 5 engineers, shipping 12 features and improving load time by 40%".',
          confidence: 0.88,
          impact: 'high',
          metadata: {
            type: 'experience',
            difficulty: 'medium',
            estimatedTime: '15 minutes',
            urgent: true,
            createdAt: Date.now() - 500000,
          },
        },
        {
          id: 'sug-exp-2',
          category: 'resume',
          title: 'Highlight leadership in recent project',
          description: 'Your e-commerce project shows technical skills but lacks leadership indicators.',
          reasoning: 'Senior roles prioritize leadership. Add mentorship, code reviews, or architectural decisions.',
          confidence: 0.71,
          impact: 'medium',
          metadata: {
            type: 'experience',
            difficulty: 'medium',
            estimatedTime: '20 minutes',
            urgent: false,
            createdAt: Date.now() - 1500000,
          },
        },

        // Profile Suggestions
        {
          id: 'sug-profile-1',
          category: 'resume',
          title: 'Improve your professional summary',
          description: 'Your summary is generic. Make it results-oriented and role-specific.',
          reasoning: 'Top 10% of candidates use specific metrics and target role keywords in summaries.',
          confidence: 0.85,
          impact: 'high',
          metadata: {
            type: 'profile',
            difficulty: 'medium',
            estimatedTime: '30 minutes',
            urgent: true,
            createdAt: Date.now() - 800000,
          },
        },
        {
          id: 'sug-profile-2',
          category: 'resume',
          title: 'Add portfolio link to profile',
          description: 'Frontend developers with portfolios get 3x more profile views.',
          reasoning: 'Visual proof of work is critical for UI/UX-focused roles.',
          confidence: 0.79,
          impact: 'medium',
          metadata: {
            type: 'profile',
            difficulty: 'easy',
            estimatedTime: '5 minutes',
            urgent: false,
            createdAt: Date.now() - 2500000,
          },
        },

        // Resume Suggestions
        {
          id: 'sug-resume-1',
          category: 'resume',
          title: 'Optimize ATS compatibility',
          description: 'Your resume uses tables and graphics that ATS systems cannot parse.',
          reasoning: 'ATS-friendly resumes have 60% higher callback rates. Use simple formatting with clear headings.',
          confidence: 0.91,
          impact: 'high',
          metadata: {
            type: 'resume',
            difficulty: 'hard',
            estimatedTime: '1 hour',
            urgent: true,
            createdAt: Date.now() - 300000,
          },
        },
        {
          id: 'sug-resume-2',
          category: 'resume',
          title: 'Add keywords for target roles',
          description: 'Your resume is missing 8 common keywords found in "Senior React Developer" job descriptions.',
          reasoning: 'Keyword optimization increases ATS match scores by 35%.',
          confidence: 0.82,
          impact: 'high',
          metadata: {
            type: 'resume',
            difficulty: 'medium',
            estimatedTime: '20 minutes',
            urgent: false,
            createdAt: Date.now() - 1200000,
          },
        },

        // Job Suggestions
        {
          id: 'sug-job-1',
          category: 'job-match',
          title: 'Apply to Senior Frontend Engineer at InnovateLab',
          description: 'This role has a 94% fit index with your profile and closes in 3 days.',
          reasoning: 'Perfect match for your React + TypeScript experience. Remote-friendly, competitive salary.',
          confidence: 0.94,
          impact: 'high',
          metadata: {
            type: 'job',
            difficulty: 'easy',
            estimatedTime: '10 minutes',
            urgent: true,
            createdAt: Date.now() - 200000,
          },
        },
        {
          id: 'sug-job-2',
          category: 'job-match',
          title: 'Apply to React Developer at StartupXYZ',
          description: '87% fit index. High growth startup with strong engineering culture.',
          reasoning: 'Your skills align well. Startup experience valued. Equity compensation.',
          confidence: 0.87,
          impact: 'medium',
          metadata: {
            type: 'job',
            difficulty: 'easy',
            estimatedTime: '10 minutes',
            urgent: false,
            createdAt: Date.now() - 600000,
          },
        },
      ];

      setAllSuggestions(mockSuggestions);

      // Mock profile strength calculation
      setProfileStrength(73);
      setCompletedSuggestionsCount(12);

      // Mock improvement history
      const mockHistory: ProfileImprovement[] = [
        { date: '2025-11-21', score: 52 },
        { date: '2025-11-24', score: 58, changeDescription: 'Added TypeScript skill' },
        { date: '2025-11-25', score: 61, changeDescription: 'Quantified achievements' },
        { date: '2025-11-26', score: 65, changeDescription: 'Improved summary' },
        { date: '2025-11-27', score: 70, changeDescription: 'Optimized resume for ATS' },
        { date: '2025-11-28', score: 73, changeDescription: 'Added portfolio link' },
      ];
      setImprovementHistory(mockHistory);

      // Convert to chart data
      const mockChartData: ChartDataPoint[] = mockHistory.map((h) => ({
        label: h.date,
        value: h.score,
      }));
      setChartData(mockChartData);

      // Mock skill gaps
      const mockSkillGaps: SkillGap[] = [
        {
          id: 'gap-1',
          skill: 'TypeScript',
          demand: 95,
          timeToLearn: '2-4 weeks',
          jobsRequiring: 247,
          resources: [
            { name: 'TypeScript Official Docs', url: '#', type: 'documentation' },
            { name: 'TypeScript Deep Dive', url: '#', type: 'course' },
            { name: 'TS for React Developers', url: '#', type: 'tutorial' },
          ],
        },
        {
          id: 'gap-2',
          skill: 'GraphQL',
          demand: 78,
          timeToLearn: '1-2 weeks',
          jobsRequiring: 156,
          resources: [
            { name: 'How to GraphQL', url: '#', type: 'tutorial' },
            { name: 'GraphQL Official Tutorial', url: '#', type: 'documentation' },
          ],
        },
        {
          id: 'gap-3',
          skill: 'Next.js',
          demand: 85,
          timeToLearn: '2-3 weeks',
          jobsRequiring: 189,
          resources: [
            { name: 'Next.js Learn', url: '#', type: 'course' },
            { name: 'Next.js Docs', url: '#', type: 'documentation' },
          ],
        },
        {
          id: 'gap-4',
          skill: 'Docker',
          demand: 72,
          timeToLearn: '1-2 weeks',
          jobsRequiring: 134,
          resources: [
            { name: 'Docker Getting Started', url: '#', type: 'tutorial' },
            { name: 'Docker Docs', url: '#', type: 'documentation' },
          ],
        },
      ];
      setSkillGaps(mockSkillGaps);

      // Mock job recommendations
      const mockJobRecs: JobRecommendation[] = [
        {
          id: 'job-1',
          title: 'Senior Frontend Engineer',
          company: 'InnovateLab',
          fitIndex: 94,
          fitBreakdown: {
            skills: 95,
            experience: 92,
            location: 100,
            salary: 88,
            culture: 90,
          },
          whyRecommended: 'Perfect match for your React + TypeScript expertise. Remote-first company with strong engineering culture.',
          closingSoon: true,
        },
        {
          id: 'job-2',
          title: 'React Developer',
          company: 'StartupXYZ',
          fitIndex: 87,
          fitBreakdown: {
            skills: 90,
            experience: 85,
            location: 80,
            salary: 95,
            culture: 85,
          },
          whyRecommended: 'High-growth startup with competitive equity. Your startup experience is a strong advantage.',
          closingSoon: false,
        },
        {
          id: 'job-3',
          title: 'Full Stack Engineer',
          company: 'TechCorp',
          fitIndex: 82,
          fitBreakdown: {
            skills: 85,
            experience: 88,
            location: 75,
            salary: 82,
            culture: 80,
          },
          whyRecommended: 'Matches your full-stack background. Opportunity to work on large-scale systems.',
          closingSoon: false,
        },
      ];
      setJobRecommendations(mockJobRecs);

      setLoading(false);
    } catch (err) {
      setError('Failed to load AI suggestions. Please try again.');
      setLoading(false);
    }
  };

  // Re-analyze profile
  const handleReAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      fetchSuggestions();
    }, 3000);
  };

  // Handle suggestion actions
  const handleAcceptSuggestion = (suggestionId: string) => {
    const suggestion = allSuggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    // Remove from list
    setAllSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

    // Navigate to relevant edit page based on category
    // This would be actual navigation in production
    console.log('Navigate to:', suggestion.category, 'edit page');
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    const suggestion = allSuggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    // Set for undo
    setRecentlyRejected(suggestion);

    // Remove from list
    setAllSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

    // Set timeout to clear undo option after 10 seconds
    if (undoTimeout) clearTimeout(undoTimeout);
    const timeout = setTimeout(() => {
      setRecentlyRejected(null);
    }, 10000);
    setUndoTimeout(timeout);
  };

  const handleUndoReject = () => {
    if (!recentlyRejected) return;

    // Restore suggestion
    setAllSuggestions((prev) => [...prev, recentlyRejected]);
    setRecentlyRejected(null);

    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
  };

  // Category counts
  const getCategoryCount = (category: SuggestionCategory): number => {
    if (category === 'all') return allSuggestions.length;
    return allSuggestions.filter((s) => {
      if (category === 'skills') return s.metadata?.type === 'skill';
      if (category === 'experience') return s.metadata?.type === 'experience';
      if (category === 'profile') return s.metadata?.type === 'profile';
      if (category === 'resume') return s.metadata?.type === 'resume';
      if (category === 'jobs') return s.metadata?.type === 'job';
      return false;
    }).length;
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-error">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error Loading Suggestions</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchSuggestions} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Analyzing state
  if (isAnalyzing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Sparkles className="mx-auto h-12 w-12 animate-pulse text-primary mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Analyzing your profile...</h2>
            <p className="text-muted-foreground mb-4">
              Our AI is reviewing your profile to generate personalized suggestions.
            </p>
            <p className="text-sm text-muted-foreground">
              Estimated time: 2-3 minutes
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - no suggestions
  if (!loading && allSuggestions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">AI Suggestions</h1>
          <p className="text-muted-foreground mt-1">
            Personalized recommendations to improve your profile
          </p>
        </div>

        <EmptyState
          icon={Sparkles}
          title="No suggestions available yet"
          description="Complete your profile to unlock AI-powered job recommendations, resume tips, and career insights."
          action={{
            label: 'Complete Profile',
            onClick: () => router.push('/dashboard/settings/profile'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              AI Suggestions
            </h1>
            <p className="text-muted-foreground mt-1">
              Personalized recommendations to improve your profile and job search
            </p>
          </div>
          <Button onClick={handleReAnalyze} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Profile Strength Overview */}
      <Card className="mb-8" data-profile-strength>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Profile Strength Score
              </CardTitle>
              <CardDescription>
                Based on {completedSuggestionsCount} completed improvements
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{profileStrength}%</div>
              <p className="text-sm text-muted-foreground">
                +{profileStrength - (improvementHistory[0]?.score || 50)} this month
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={profileStrength} className="h-3 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Pending Suggestions</p>
              <p className="text-2xl font-semibold">{allSuggestions.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold">{completedSuggestionsCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Projected Impact</p>
              <p className="text-2xl font-semibold text-success">+{100 - profileStrength}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Undo Notification */}
      {recentlyRejected && (
        <Card className="mb-4 border-warning bg-warning/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                <span className="text-sm">
                  Suggestion rejected: <strong>{recentlyRejected.title}</strong>
                </span>
              </div>
              <Button onClick={handleUndoReject} variant="outline" size="sm">
                Undo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList>
          <TabsTrigger value="suggestions">
            <Lightbulb className="h-4 w-4 mr-2" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="skill-gaps">
            <Award className="h-4 w-4 mr-2" />
            Skill Gaps
          </TabsTrigger>
          <TabsTrigger value="job-recs">
            <Briefcase className="h-4 w-4 mr-2" />
            Job Recommendations
          </TabsTrigger>
          <TabsTrigger value="progress">
            <TrendingUp className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="mt-6">
          {/* Category Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {(['all', 'skills', 'experience', 'profile', 'resume', 'jobs'] as SuggestionCategory[]).map(
                (category) => (
                  <Button
                    key={category}
                    variant={activeCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveCategory(category)}
                  >
                    {titleCase(category)}
                    <Badge variant="secondary" className="ml-2">
                      {getCategoryCount(category)}
                    </Badge>
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Filters & Sort */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterDifficulty} onValueChange={(v) => setFilterDifficulty(v as FilterDifficulty)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy (Quick Wins)</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={filterImpact} onValueChange={(v) => setFilterImpact(v as FilterImpact)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact Levels</SelectItem>
                <SelectItem value="high">High Impact</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="low">Low Impact</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority (Smart)</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="impact">Impact</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredSuggestions.length} of {allSuggestions.length} suggestions
            </div>
          </div>

          {/* Suggestions List */}
          <div className="space-y-4">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion) => (
                <div key={suggestion.id} data-suggestion-card>
                  <AISuggestionCard
                    suggestion={suggestion}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                  />
                </div>
              ))
            ) : (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <p className="text-muted-foreground">
                    No suggestions match your current filters.
                  </p>
                  <Button
                    onClick={() => {
                      setActiveCategory('all');
                      setFilterDifficulty('all');
                      setFilterImpact('all');
                    }}
                    variant="outline"
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Skill Gaps Tab */}
        <TabsContent value="skill-gaps" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Gap Analysis</CardTitle>
              <CardDescription>
                Skills that are highly demanded in your target roles but missing from your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {skillGaps.map((gap) => (
                  <div key={gap.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">{gap.skill}</h3>
                        <p className="text-sm text-muted-foreground">
                          Required by {gap.jobsRequiring} jobs in your target market
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={gap.demand >= 80 ? 'default' : 'secondary'}>
                          {gap.demand}% demand
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {gap.timeToLearn}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <Progress value={gap.demand} className="h-2" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Learning Resources:</p>
                      <div className="flex flex-wrap gap-2">
                        {gap.resources.map((resource, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 w-3 mr-1" />
                              {resource.name}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Recommendations Tab */}
        <TabsContent value="job-recs" className="mt-6">
          <div className="space-y-4">
            {jobRecommendations.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {job.title}
                        {job.closingSoon && (
                          <Badge variant="destructive" className="text-xs">
                            Closing Soon
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{job.company}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">
                        {job.fitIndex}%
                      </div>
                      <p className="text-xs text-muted-foreground">Fit Index</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{job.whyRecommended}</p>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Fit Breakdown:</p>
                    <div className="space-y-2">
                      {Object.entries(job.fitBreakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24 capitalize">
                            {key}
                          </span>
                          <Progress value={value} className="h-2 flex-1" />
                          <span className="text-xs font-medium w-12 text-right">
                            {value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">
                      <Target className="h-4 w-4 mr-2" />
                      Apply Now
                    </Button>
                    <Button variant="outline">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Improvement Over Time</CardTitle>
              <CardDescription>
                Track how your profile strength has improved as you implement suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                data={chartData}
                type="line"
                height={300}
              />

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Recent Improvements</h3>
                <div className="space-y-3">
                  {improvementHistory
                    .filter((h) => h.changeDescription)
                    .reverse()
                    .map((improvement, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-muted-foreground">{improvement.date}</span>
                        <span className="flex-1">{improvement.changeDescription}</span>
                        <Badge variant="secondary">+{improvement.score}%</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
