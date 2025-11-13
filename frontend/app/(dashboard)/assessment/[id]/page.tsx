/**
 * Assessment Page - Sprint 19-20 Week 38 Day 5
 *
 * Main assessment page that integrates all assessment components
 * - Timer
 * - Tab tracking
 * - Question components (MCQ, Text, Coding)
 * - Code execution
 * - Submission flow
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AssessmentTimer } from '@/components/assessment/AssessmentTimer';
import { MCQQuestion } from '@/components/assessment/MCQQuestion';
import { TextQuestion } from '@/components/assessment/TextQuestion';
import { CodingQuestion } from '@/components/assessment/CodingQuestion';
import { AssessmentSubmission } from '@/components/assessment/AssessmentSubmission';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Question {
  id: string;
  type: 'mcq' | 'text' | 'coding';
  question: string;
  options?: string[];
  multipleChoice?: boolean;
  codeTemplate?: string;
  language?: string;
  testCases?: any[];
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  questions: Question[];
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startTime] = useState(Date.now());
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Load assessment data
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/assessments/${assessmentId}`);
        // const data = await response.json();

        // Mock data for development/testing
        const mockAssessment: Assessment = {
          id: assessmentId,
          title: 'Software Engineer Assessment',
          description: 'Test your knowledge of web development',
          duration: 60,
          questions: [
            {
              id: 'q1',
              type: 'mcq',
              question: 'What is React?',
              options: [
                'A JavaScript library',
                'A programming language',
                'A database',
                'A CSS framework',
              ],
              multipleChoice: false,
            },
            {
              id: 'q2',
              type: 'mcq',
              question: 'Which technologies are used for web development? (Select all that apply)',
              options: ['HTML', 'CSS', 'JavaScript', 'Python'],
              multipleChoice: true,
            },
            {
              id: 'q3',
              type: 'text',
              question: 'Explain the concept of React hooks in your own words.',
            },
            {
              id: 'q4',
              type: 'coding',
              question: 'Write a function that reverses a string.',
              codeTemplate: 'function reverseString(str) {\n  // Your code here\n}',
              language: 'javascript',
              testCases: [
                { input: '"hello"', expected: '"olleh"' },
                { input: '"world"', expected: '"dlrow"' },
                { input: '""', expected: '""' },
              ],
            },
          ],
        };

        setAssessment(mockAssessment);
      } catch (error) {
        console.error('Failed to load assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [assessmentId]);

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Prevent accidental page close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(answers).length > 0 && !isTimerExpired) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [answers, isTimerExpired]);

  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Handle timer expiry
  const handleTimerExpire = () => {
    setIsTimerExpired(true);
    // Auto-submit when timer expires
    handleSubmit(answers);
  };

  // Handle submission
  const handleSubmit = async (submittedAnswers: Record<string, any>) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/assessments/${assessmentId}/submit`, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     answers: submittedAnswers,
      //     timeSpent: Math.floor((Date.now() - startTime) / 1000),
      //     tabSwitchCount,
      //   }),
      // });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect to results page
      router.push(`/assessment/${assessmentId}/results`);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      throw error;
    }
  };

  // Navigation handlers
  const goToNext = () => {
    if (assessment && currentQuestionIndex < assessment.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Last question - show submission page
      setCurrentQuestionIndex(assessment?.questions.length || 0);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Not Found</h1>
          <p className="text-gray-600">The assessment you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const isOnSubmissionPage = currentQuestionIndex === assessment.questions.length;
  const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-sm text-gray-600">{assessment.description}</p>
            </div>
            <AssessmentTimer
              duration={assessment.duration * 60}
              onExpire={handleTimerExpire}
            />
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>
                Question {Math.min(currentQuestionIndex + 1, assessment.questions.length)} of{' '}
                {assessment.questions.length}
              </span>
              <span>{Math.round(((currentQuestionIndex + 1) / assessment.questions.length) * 100)}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(((currentQuestionIndex + 1) / assessment.questions.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
            >
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / assessment.questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Tab Switch Warning */}
          {tabSwitchCount > 0 && (
            <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              Tab switch detected ({tabSwitchCount} time{tabSwitchCount !== 1 ? 's' : ''})
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {isOnSubmissionPage ? (
          <AssessmentSubmission
            answers={answers}
            totalQuestions={assessment.questions.length}
            onSubmit={handleSubmit}
            timeSpentSeconds={timeSpentSeconds}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Question Number */}
            <div className="mb-4 text-sm font-medium text-gray-500">
              Question {currentQuestionIndex + 1} of {assessment.questions.length}
            </div>

            {/* Question Content */}
            {currentQuestion.type === 'mcq' && (
              <MCQQuestion
                question={currentQuestion.question}
                options={currentQuestion.options || []}
                multipleChoice={currentQuestion.multipleChoice || false}
                selectedOptions={answers[currentQuestion.id]?.selected_options || []}
                onChange={(selected) =>
                  handleAnswerChange(currentQuestion.id, { selected_options: selected })
                }
              />
            )}

            {currentQuestion.type === 'text' && (
              <TextQuestion
                question={currentQuestion.question}
                value={answers[currentQuestion.id]?.text_response || ''}
                onChange={(text) =>
                  handleAnswerChange(currentQuestion.id, { text_response: text })
                }
              />
            )}

            {currentQuestion.type === 'coding' && (
              <CodingQuestion
                question={currentQuestion.question}
                initialCode={
                  answers[currentQuestion.id]?.code_response || currentQuestion.codeTemplate || ''
                }
                language={currentQuestion.language || 'javascript'}
                onCodeChange={(code) =>
                  handleAnswerChange(currentQuestion.id, { code_response: code })
                }
                testCases={currentQuestion.testCases}
              />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                onClick={goToPrevious}
                variant="outline"
                disabled={currentQuestionIndex === 0}
                className={currentQuestionIndex === 0 ? 'invisible' : ''}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button onClick={goToNext}>
                {currentQuestionIndex === assessment.questions.length - 1 ? (
                  'Submit'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
