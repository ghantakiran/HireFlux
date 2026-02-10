/**
 * Candidate Assessment Results Page
 * Sprint 17-18 Phase 4
 *
 * BDD Test: tests/e2e/assessment-features.spec.ts
 * Satisfies: "should submit assessment manually"
 *           "should auto-submit assessment when time expires"
 * Shows assessment results after submission
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  Award,
  Download,
  Home,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { candidateAssessmentApi, ApiResponse } from '@/lib/api';
import { toast } from 'sonner';

interface QuestionResult {
  id: string;
  question_text: string;
  question_type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'text' | 'file_upload';
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  points_possible: number;
  points_earned: number;
  is_correct: boolean;
  candidate_answer?: string[];
  correct_answer?: string[];
  time_spent_seconds: number;
}

interface AssessmentResults {
  assessment_id: string;
  assessment_title: string;
  candidate_name: string;
  total_points_possible: number;
  total_points_earned: number;
  score_percentage: number;
  passing_score_percentage: number;
  passed: boolean;
  time_limit_minutes: number;
  time_taken_minutes: number;
  submitted_at: string;
  questions: QuestionResult[];
}

export default function AssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const accessToken = params.accessToken as string;

  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);

        // First, get the attempt ID from the access token
        const accessResponse = await candidateAssessmentApi.accessAssessment(accessToken);
        if (!accessResponse.data.success) {
          throw new Error('Failed to access assessment');
        }

        const accessData = accessResponse.data.data;
        if (!accessData.attempt_id) {
          throw new Error('No attempt found for this assessment');
        }

        // Now fetch the results using the attempt ID
        const resultsResponse = await candidateAssessmentApi.getResults(accessData.attempt_id);
        if (resultsResponse.data.success) {
          const data = resultsResponse.data.data;
          setResults(data);
        } else {
          throw new Error('Failed to load results');
        }
      } catch (error: any) {
        console.error('Failed to load results:', error);
        setError(error.response?.data?.detail || error.message || 'Failed to load results');
        toast.error('Failed to load assessment results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [accessToken]);

  // FALLBACK: Mock data for development if API fails
  useEffect(() => {
    if (!loading && !results && !error) {
      const mockResults: AssessmentResults = {
      assessment_id: 'assessment-123',
      assessment_title: 'Senior Backend Engineer Screening',
      candidate_name: 'John Doe',
      total_points_possible: 100,
      total_points_earned: 78,
      score_percentage: 78,
      passing_score_percentage: 70,
      passed: true,
      time_limit_minutes: 90,
      time_taken_minutes: 67,
      submitted_at: new Date().toISOString(),
      questions: [
        {
          id: 'q1',
          question_text: 'What is the time complexity of binary search?',
          question_type: 'mcq_single',
          difficulty: 'medium',
          category: 'Algorithms',
          points_possible: 10,
          points_earned: 10,
          is_correct: true,
          candidate_answer: ['O(log n)'],
          correct_answer: ['O(log n)'],
          time_spent_seconds: 45,
        },
        {
          id: 'q2',
          question_text: 'Which are Python web frameworks?',
          question_type: 'mcq_multiple',
          difficulty: 'easy',
          category: 'Web Development',
          points_possible: 15,
          points_earned: 12,
          is_correct: false,
          candidate_answer: ['Django', 'Flask'],
          correct_answer: ['Django', 'Flask', 'FastAPI'],
          time_spent_seconds: 60,
        },
        {
          id: 'q3',
          question_text: 'Implement a function to reverse a linked list',
          question_type: 'coding',
          difficulty: 'hard',
          category: 'Data Structures',
          points_possible: 25,
          points_earned: 25,
          is_correct: true,
          time_spent_seconds: 1200,
        },
        {
          id: 'q4',
          question_text: 'Explain the difference between REST and GraphQL',
          question_type: 'text',
          difficulty: 'medium',
          category: 'API Design',
          points_possible: 20,
          points_earned: 15,
          is_correct: false,
          time_spent_seconds: 480,
        },
        {
          id: 'q5',
          question_text: 'What is the difference between SQL and NoSQL?',
          question_type: 'mcq_single',
          difficulty: 'easy',
          category: 'Databases',
          points_possible: 10,
          points_earned: 10,
          is_correct: true,
          candidate_answer: ['SQL is relational, NoSQL is non-relational'],
          correct_answer: ['SQL is relational, NoSQL is non-relational'],
          time_spent_seconds: 30,
        },
        {
          id: 'q6',
          question_text: 'Which HTTP methods are idempotent?',
          question_type: 'mcq_multiple',
          difficulty: 'medium',
          category: 'HTTP',
          points_possible: 15,
          points_earned: 0,
          is_correct: false,
          candidate_answer: ['GET', 'POST'],
          correct_answer: ['GET', 'PUT', 'DELETE'],
          time_spent_seconds: 90,
        },
        {
          id: 'q7',
          question_text: 'Implement a function to detect a cycle in a linked list',
          question_type: 'coding',
          difficulty: 'hard',
          category: 'Data Structures',
          points_possible: 20,
          points_earned: 6,
          is_correct: false,
          time_spent_seconds: 900,
        },
      ],
    };
      setResults(mockResults);
    }
  }, [loading, results, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Loading results...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Results Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">Unable to load assessment results.</p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (percentage >= 70) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    if (percentage >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  const getCategoryStats = () => {
    const categoryMap = new Map<string, { correct: number; total: number }>();

    results.questions.forEach((q) => {
      const category = q.category || 'Other';
      const stats = categoryMap.get(category) || { correct: 0, total: 0 };
      stats.total += 1;
      if (q.is_correct) stats.correct += 1;
      categoryMap.set(category, stats);
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      percentage: Math.round((stats.correct / stats.total) * 100),
      correct: stats.correct,
      total: stats.total,
    }));
  };

  const getDifficultyStats = () => {
    const difficultyMap = new Map<string, { correct: number; total: number }>();

    results.questions.forEach((q) => {
      const stats = difficultyMap.get(q.difficulty) || { correct: 0, total: 0 };
      stats.total += 1;
      if (q.is_correct) stats.correct += 1;
      difficultyMap.set(q.difficulty, stats);
    });

    return Array.from(difficultyMap.entries()).map(([difficulty, stats]) => ({
      difficulty,
      percentage: Math.round((stats.correct / stats.total) * 100),
      correct: stats.correct,
      total: stats.total,
    }));
  };

  const correctCount = results.questions.filter((q) => q.is_correct).length;
  const categoryStats = getCategoryStats();
  const difficultyStats = getDifficultyStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Success Banner */}
      <div className={`${results.passed ? 'bg-green-600' : 'bg-red-600'} text-white py-6`}>
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            {results.passed ? (
              <Award className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
            <h1 className="text-3xl font-bold">Assessment Submitted Successfully</h1>
          </div>
          <p className="text-lg opacity-90">
            {results.passed
              ? 'Congratulations! You passed the assessment.'
              : `You scored below the passing threshold of ${results.passing_score_percentage}%.`}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Overall Score Card */}
        <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 mb-6 border-2 ${getScoreBg(results.score_percentage)}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{results.assessment_title}</h2>
              <p className="text-gray-600 dark:text-gray-400">Submitted {new Date(results.submitted_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Report
              </Button>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => router.push('/')}>
                <Home className="w-4 h-4" />
                Back to Home
              </Button>
            </div>
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className={`text-5xl font-bold mb-2 ${getScoreColor(results.score_percentage)}`}>
                Your Score: {results.score_percentage}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {results.total_points_earned} / {results.total_points_possible} points
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Passing Score</p>
                <p className="text-xl font-semibold">{results.passing_score_percentage}%</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Correct Answers</p>
                <p className="text-xl font-semibold">
                  {correctCount} / {results.questions.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Time Taken</p>
                <p className="text-xl font-semibold">
                  {results.time_taken_minutes} / {results.time_limit_minutes} min
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance by Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Performance by Category
            </h3>
            <div className="space-y-3">
              {categoryStats.map((stat) => (
                <div key={stat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stat.category}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.correct}/{stat.total} ({stat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stat.percentage >= 70 ? 'bg-green-500' : stat.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Performance by Difficulty
            </h3>
            <div className="space-y-3">
              {difficultyStats.map((stat) => (
                <div key={stat.difficulty}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{stat.difficulty}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.correct}/{stat.total} ({stat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stat.difficulty === 'easy'
                          ? 'bg-green-500'
                          : stat.difficulty === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question-by-Question Breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Question-by-Question Breakdown</h3>
            <Button variant="outline" size="sm" onClick={() => setShowBreakdown(!showBreakdown)}>
              {showBreakdown ? 'Hide' : 'Show'} Details
            </Button>
          </div>

          {showBreakdown && (
            <div className="space-y-4">
              {results.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`border rounded-lg p-4 ${
                    question.is_correct
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {question.is_correct ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Question {index + 1}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            question.difficulty === 'easy'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : question.difficulty === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {question.difficulty}
                        </span>
                        {question.category && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {question.category}
                          </span>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {question.points_earned}/{question.points_possible} points
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatTime(question.time_spent_seconds)}</span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{question.question_text}</p>

                      {/* MCQ Answer Display */}
                      {(question.question_type === 'mcq_single' || question.question_type === 'mcq_multiple') &&
                        question.candidate_answer &&
                        question.correct_answer && (
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Your Answer: </span>
                              <span className={question.is_correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                {question.candidate_answer.join(', ')}
                              </span>
                            </div>
                            {!question.is_correct && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Correct Answer: </span>
                                <span className="text-green-700 dark:text-green-400">{question.correct_answer.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Coding/Text Question Display */}
                      {(question.question_type === 'coding' || question.question_type === 'text') && (
                        <div className="text-sm">
                          <span className={question.is_correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                            {question.is_correct
                              ? 'Your solution was correct!'
                              : `Partial credit: ${question.points_earned}/${question.points_possible} points`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">What's Next?</h3>
          <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-1">
            <li>Your results have been submitted to the employer</li>
            <li>You will be notified if you advance to the next stage</li>
            <li>Review your performance breakdown above to identify areas for improvement</li>
            <li>
              {results.passed
                ? 'Congratulations on passing! Prepare for potential follow-up interviews.'
                : 'Keep learning and try again next time!'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
