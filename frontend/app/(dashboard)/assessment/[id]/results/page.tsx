/**
 * Assessment Results Page - Sprint 19-20 Week 38 Day 5
 *
 * Displays assessment results after submission
 * Shows score, feedback, and next steps
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { CodeExecutionResults } from '@/components/assessment/CodeExecutionResults';
import { formatDuration } from '@/lib/utils';

interface AssessmentResult {
  id: string;
  assessmentTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  submittedAt: string;
  tabSwitchCount: number;
  questionResults: QuestionResult[];
}

interface QuestionResult {
  questionId: string;
  type: 'mcq' | 'text' | 'coding';
  question: string;
  userAnswer: any;
  correctAnswer?: any;
  isCorrect?: boolean;
  feedback?: string;
  codeExecutionResults?: any;
}

export default function AssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/assessments/${assessmentId}/results`);
        // const data = await response.json();

        // Mock results for development/testing
        const mockResults: AssessmentResult = {
          id: assessmentId,
          assessmentTitle: 'Software Engineer Assessment',
          score: 75,
          totalQuestions: 4,
          correctAnswers: 3,
          timeSpent: 1825, // 30m 25s
          submittedAt: new Date().toISOString(),
          tabSwitchCount: 2,
          questionResults: [
            {
              questionId: 'q1',
              type: 'mcq',
              question: 'What is React?',
              userAnswer: ['A JavaScript library'],
              correctAnswer: ['A JavaScript library'],
              isCorrect: true,
              feedback: 'Correct! React is a JavaScript library for building user interfaces.',
            },
            {
              questionId: 'q2',
              type: 'mcq',
              question: 'Which technologies are used for web development?',
              userAnswer: ['HTML', 'CSS'],
              correctAnswer: ['HTML', 'CSS', 'JavaScript'],
              isCorrect: false,
              feedback: 'Partially correct. You missed JavaScript, which is also essential.',
            },
            {
              questionId: 'q3',
              type: 'text',
              question: 'Explain the concept of React hooks.',
              userAnswer: 'React hooks are functions that let you use state and lifecycle features.',
              feedback:
                'Good explanation! You covered the key concepts of React hooks.',
              isCorrect: true,
            },
            {
              questionId: 'q4',
              type: 'coding',
              question: 'Write a function that reverses a string.',
              userAnswer: 'function reverseString(str) { return str.split("").reverse().join(""); }',
              isCorrect: true,
              codeExecutionResults: {
                status: 'success',
                totalTests: 3,
                passedTests: 3,
                failedTests: 0,
                executionTime: 125,
                testCases: [
                  {
                    name: 'Test Case 1',
                    input: '"hello"',
                    expected: '"olleh"',
                    actual: '"olleh"',
                    passed: true,
                  },
                  {
                    name: 'Test Case 2',
                    input: '"world"',
                    expected: '"dlrow"',
                    actual: '"dlrow"',
                    passed: true,
                  },
                  {
                    name: 'Test Case 3',
                    input: '""',
                    expected: '""',
                    actual: '""',
                    passed: true,
                  },
                ],
                consoleOutput: [],
              },
            },
          ],
        };

        setResults(mockResults);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [assessmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Results Not Found</h1>
          <p className="text-gray-600">The assessment results could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Assessment Results</h1>
          <p className="text-gray-600 mt-1">{results.assessmentTitle}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Overall Score Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                results.score >= 70
                  ? 'bg-green-100 text-green-700'
                  : results.score >= 50
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <span className="text-3xl font-bold">{results.score}%</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {results.score >= 70 ? 'Great Job!' : results.score >= 50 ? 'Good Effort!' : 'Keep Learning!'}
            </h2>

            <p className="text-gray-600 mb-6">
              You answered {results.correctAnswers} out of {results.totalQuestions} questions correctly
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-2xl font-bold">{results.correctAnswers}</span>
                </div>
                <p className="text-sm text-gray-600">Correct</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
                  <XCircle className="w-5 h-5" />
                  <span className="text-2xl font-bold">
                    {results.totalQuestions - results.correctAnswers}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Incorrect</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-bold">{formatDuration(results.timeSpent)}</span>
                </div>
                <p className="text-sm text-gray-600">Time Spent</p>
              </div>
            </div>

            {/* Tab Switch Warning */}
            {results.tabSwitchCount > 0 && (
              <div className="mt-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                Note: {results.tabSwitchCount} tab switch{results.tabSwitchCount !== 1 ? 'es' : ''}{' '}
                detected during the assessment
              </div>
            )}
          </div>
        </div>

        {/* Detailed Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detailed Results
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {results.questionResults.map((question, index) => (
              <div key={question.questionId} className="p-6 space-y-4">
                {/* Question Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Question {index + 1}
                      </span>
                      {question.isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <h4 className="text-base font-medium text-gray-900">{question.question}</h4>
                  </div>
                </div>

                {/* Coding Question Results */}
                {question.type === 'coding' && question.codeExecutionResults && (
                  <CodeExecutionResults results={question.codeExecutionResults} />
                )}

                {/* Feedback */}
                {question.feedback && question.type !== 'coding' && (
                  <div
                    className={`p-3 rounded-lg ${
                      question.isCorrect
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        question.isCorrect ? 'text-green-700' : 'text-yellow-700'
                      }`}
                    >
                      {question.feedback}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
          <Button onClick={() => router.push('/assessments')}>
            Browse More Assessments
          </Button>
        </div>
      </main>
    </div>
  );
}
