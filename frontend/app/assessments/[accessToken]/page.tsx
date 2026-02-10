/**
 * Candidate Assessment Taking Page
 * Sprint 17-18 Phase 4
 *
 * BDD Test: tests/e2e/assessment-features.spec.ts
 * Satisfies: "should take assessment with access token"
 *           "should answer MCQ question and navigate"
 *           "should write and execute code for coding question"
 *           "should show time warning before expiry"
 *           "should auto-submit assessment when time expires"
 *           "should submit assessment manually"
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Play,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { candidateAssessmentApi, ApiResponse } from '@/lib/api';
import { AssessmentTimer } from '@/components/assessment/AssessmentTimer';
import { useTabSwitchTracking } from '@/components/assessment/useTabSwitchTracking';
import { AssessmentProgress, QuestionNavigator } from '@/components/assessment/AssessmentProgress';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'text' | 'file_upload';
  options?: string[];
  correct_answers?: string[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  test_cases?: Array<{ input: string; expected_output: string }>;
  starter_code?: string;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  questions: Question[];
}

interface Answer {
  question_id: string;
  selected_options?: string[];
  code?: string;
  text_response?: string;
}

export default function TakeAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const accessToken = params.accessToken as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeExpiredDialog, setShowTimeExpiredDialog] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string>('');
  const [testResults, setTestResults] = useState<Array<{ passed: boolean; message: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showSuspiciousActivityWarning, setShowSuspiciousActivityWarning] = useState(false);

  useEffect(() => {
    // Fetch assessment data from API using access token
    const fetchAssessmentAccess = async () => {
      try {
        setIsLoading(true);
        const response = await candidateAssessmentApi.accessAssessment(accessToken);

        if (response.data.success) {
          const accessData = response.data.data;

          // Set assessment data
          setAssessment({
            id: accessData.assessment_id,
            title: accessData.assessment_title,
            description: accessData.assessment_description || '',
            time_limit_minutes: accessData.time_limit_minutes || 60,
            questions: [], // Will be loaded when starting assessment
          });

          // Check if already in progress
          if (accessData.status === 'in_progress' && accessData.attempt_id) {
            setAttemptId(accessData.attempt_id);
            setHasStarted(true);
            if (accessData.time_remaining_minutes) {
              setTimeRemaining(accessData.time_remaining_minutes * 60);
            }
            // TODO: Load existing attempt data and answers
          } else if (accessData.status === 'completed') {
            // Redirect to results if already completed
            router.push(`/assessments/${accessToken}/results`);
          } else if (accessData.status === 'expired') {
            setAccessError('This assessment has expired.');
          }
        }
      } catch (error: any) {
        console.error('Failed to access assessment:', error);
        setAccessError(error.response?.data?.detail || 'Failed to load assessment');
        toast.error('Failed to load assessment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssessmentAccess();
  }, [accessToken, router]);

  // FALLBACK: Mock data for development if API fails
  useEffect(() => {
    if (!isLoading && !assessment && !accessError) {
      const mockAssessment: Assessment = {
      id: 'assessment-123',
      title: 'Senior Backend Engineer Screening',
      description: 'Technical assessment for backend positions',
      time_limit_minutes: 90,
      questions: [
        {
          id: 'q1',
          question_text: 'What is the time complexity of binary search?',
          question_type: 'mcq_single',
          options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
          correct_answers: ['O(log n)'],
          points: 10,
          difficulty: 'medium',
          category: 'Algorithms',
        },
        {
          id: 'q2',
          question_text: 'Which are Python web frameworks?',
          question_type: 'mcq_multiple',
          options: ['Django', 'Flask', 'React', 'FastAPI'],
          correct_answers: ['Django', 'Flask', 'FastAPI'],
          points: 15,
          difficulty: 'easy',
          category: 'Web Development',
        },
        {
          id: 'q3',
          question_text: 'Implement a function to reverse a linked list',
          question_type: 'coding',
          points: 25,
          difficulty: 'hard',
          category: 'Data Structures',
          starter_code: `def reverse_linked_list(head):
    # Write your code here
    pass`,
          test_cases: [
            { input: '1->2->3->4->5', expected_output: '5->4->3->2->1' },
            { input: '1->2', expected_output: '2->1' },
          ],
        },
      ],
    };
      setAssessment(mockAssessment);
    }
  }, [isLoading, assessment, accessError]);

  // Removed timer interval - now handled by AssessmentTimer component

  // Tab-switch tracking (anti-cheating)
  const { tabSwitchCount, fullScreenExitCount } = useTabSwitchTracking({
    attemptId,
    enabled: hasStarted && !isSubmitting,
    onTabSwitch: () => {
      console.log('Tab switch detected');
    },
    onFullScreenExit: () => {
      console.log('Full-screen exit detected');
    },
    onSuspiciousBehavior: (eventType) => {
      console.warn('Suspicious behavior detected:', eventType);
      setShowSuspiciousActivityWarning(true);
      toast.error('Suspicious activity detected. This has been logged.', {
        duration: 10000,
      });
      // Auto-hide warning after 15 seconds
      setTimeout(() => setShowSuspiciousActivityWarning(false), 15000);
    },
  });

  const handleStartAssessment = async () => {
    if (!assessment) return;

    try {
      const response = await candidateAssessmentApi.startAssessment(assessment.id, {
        ip_address: window.location.hostname,
        user_agent: navigator.userAgent,
      });

      if (response.data.success) {
        const attemptData = response.data.data;

        setAttemptId(attemptData.attempt_id);
        setHasStarted(true);
        setTimeRemaining((attemptData.time_limit_minutes || assessment.time_limit_minutes) * 60);

        // Update assessment with questions
        setAssessment({
          ...assessment,
          questions: attemptData.questions.map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            points: q.points,
            difficulty: 'medium' as const, // Default, could come from API
            test_cases: q.test_cases,
            starter_code: q.starter_code,
          })),
        });

        toast.success('Assessment started successfully');
      }
    } catch (error: any) {
      console.error('Failed to start assessment:', error);
      toast.error('Failed to start assessment');
    }
  };

  const handleTimeExpired = () => {
    setShowTimeExpiredDialog(true);
    // Auto-submit after a delay
    setTimeout(() => {
      handleSubmitAssessment(true);
    }, 3000);
  };

  const handleTimeWarning = (minutesLeft: number) => {
    setShowTimeWarning(true);
    toast.warning(`${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} remaining!`, {
      duration: 5000,
    });
    // Auto-hide warning after 10 seconds
    setTimeout(() => setShowTimeWarning(false), 10000);
  };

  const currentQuestion = assessment?.questions[currentQuestionIndex];

  const handleAnswerChange = async (questionId: string, answer: Partial<Answer>) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existing = newAnswers.get(questionId) || { question_id: questionId };
      newAnswers.set(questionId, { ...existing, ...answer });
      return newAnswers;
    });

    // Auto-save answer to backend
    if (attemptId) {
      try {
        await candidateAssessmentApi.submitAnswer(attemptId, {
          question_id: questionId,
          answer_data: answer,
        });
      } catch (error) {
        console.error('Failed to auto-save answer:', error);
        // Don't show error toast for auto-save failures
      }
    }
  };

  const handleMCQOptionChange = (option: string, isMultiple: boolean) => {
    if (!currentQuestion) return;

    const currentAnswer = answers.get(currentQuestion.id);
    let selectedOptions: string[] = currentAnswer?.selected_options || [];

    if (isMultiple) {
      // Toggle option for multiple choice
      if (selectedOptions.includes(option)) {
        selectedOptions = selectedOptions.filter((opt) => opt !== option);
      } else {
        selectedOptions = [...selectedOptions, option];
      }
    } else {
      // Single choice - replace selection
      selectedOptions = [option];
    }

    handleAnswerChange(currentQuestion.id, { selected_options: selectedOptions });
  };

  const handleCodeChange = (code: string) => {
    if (!currentQuestion) return;
    handleAnswerChange(currentQuestion.id, { code });
  };

  const handleRunCode = async () => {
    if (!currentQuestion || !attemptId) return;

    const answer = answers.get(currentQuestion.id);
    if (!answer?.code) {
      toast.error('Please write some code first');
      return;
    }

    setIsRunningCode(true);
    setCodeOutput('');
    setTestResults([]);

    try {
      const response = await candidateAssessmentApi.executeCode(attemptId, {
        question_id: currentQuestion.id,
        code: answer.code,
        language: 'python', // TODO: Get language from question or user selection
        save_to_response: true,
      });

      if (response.data.success) {
        const result = response.data.data;

        if (result.status === 'success') {
          const testResults = [];
          for (let i = 0; i < result.test_cases_total; i++) {
            testResults.push({
              passed: i < result.test_cases_passed,
              message: `Test Case ${i + 1}: ${i < result.test_cases_passed ? 'Passed' : 'Failed'}`,
            });
          }
          setTestResults(testResults);
          setCodeOutput(result.output || `${result.test_cases_passed}/${result.test_cases_total} test cases passed`);
          toast.success('Code executed successfully');
        } else {
          setCodeOutput(result.error_message || result.output || 'Execution failed');
          toast.error('Code execution failed');
        }
      }
    } catch (error: any) {
      console.error('Code execution failed:', error);
      toast.error('Code execution failed');
      setCodeOutput(`Error: ${error.response?.data?.detail || 'Failed to execute code'}`);
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleNavigateQuestion = (direction: 'next' | 'prev') => {
    if (!assessment) return;

    if (direction === 'next' && currentQuestionIndex < assessment.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }

    // Reset code execution state when navigating
    setCodeOutput('');
    setTestResults([]);
  };

  const handleSubmitAssessment = async (autoSubmit = false) => {
    if (!attemptId) return;

    setIsSubmitting(true);
    try {
      const response = await candidateAssessmentApi.submitAssessment(attemptId);

      if (response.data.success) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }

        const result = response.data.data;
        toast.success(
          autoSubmit
            ? 'Assessment auto-submitted due to time expiry'
            : 'Assessment submitted successfully'
        );

        // Redirect to results page
        router.push(`/assessments/${accessToken}/results`);
      }
    } catch (error: any) {
      console.error('Failed to submit assessment:', error);
      toast.error('Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed formatTime and getTimerClass - now handled by AssessmentTimer component

  const getAnsweredCount = () => {
    return answers.size;
  };

  const getAnsweredQuestionIndices = (): Set<number> => {
    const indices = new Set<number>();
    if (!assessment) return indices;

    assessment.questions.forEach((q, index) => {
      if (answers.has(q.id)) {
        indices.add(index);
      }
    });

    return indices;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Loading assessment...</p>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Access Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{accessError}</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Loading assessment...</p>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{assessment.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{assessment.description}</p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>{assessment.questions.length} questions</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>{assessment.time_limit_minutes} minutes</span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Instructions:</h3>
            <ul className="list-disc list-inside text-blue-800 dark:text-blue-300 space-y-1 text-sm">
              <li>Answer all questions to the best of your ability</li>
              <li>You can navigate between questions using Next/Previous buttons</li>
              <li>Your answers are auto-saved as you go</li>
              <li>Submit your assessment before time runs out</li>
              <li>Once submitted, you cannot make changes</li>
            </ul>
          </div>

          <Button
            onClick={handleStartAssessment}
            data-testid="start-assessment-button"
            className="w-full h-12 text-lg"
            size="lg"
          >
            Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{assessment.title}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" data-testid="timer">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Time Remaining:</span>
                <AssessmentTimer
                  timeRemaining={timeRemaining}
                  onTimeExpired={handleTimeExpired}
                  onWarning={handleTimeWarning}
                />
              </div>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                data-testid="submit-assessment-button"
                variant="default"
              >
                Submit Assessment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Time Warning Banner */}
      {showTimeWarning && timeRemaining > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto px-4 py-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Time is running out!</span>
          </div>
        </div>
      )}

      {/* Suspicious Activity Warning Banner */}
      {showSuspiciousActivityWarning && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="container mx-auto px-4 py-2 flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">
              Suspicious activity detected and logged. Please remain on this tab.
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex gap-6">
          {/* Sidebar - Question Navigator */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 sticky top-24">
              <QuestionNavigator
                totalQuestions={assessment.questions.length}
                currentQuestionIndex={currentQuestionIndex}
                answeredQuestions={getAnsweredQuestionIndices()}
                onQuestionSelect={(index) => setCurrentQuestionIndex(index)}
              />
            </div>
          </aside>

          {/* Main Question Area */}
          <main className="flex-1">
            {currentQuestion && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
                {/* Progress Indicator */}
                <AssessmentProgress
                  totalQuestions={assessment.questions.length}
                  answeredQuestions={getAnsweredCount()}
                  currentQuestionIndex={currentQuestionIndex}
                  className="mb-6"
                />

                {/* Question Header */}
                <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Question {currentQuestionIndex + 1} of {assessment.questions.length}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      currentQuestion.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : currentQuestion.difficulty === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{currentQuestion.points} points</span>
                  {currentQuestion.category && (
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {currentQuestion.category}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Answered: {getAnsweredCount()}/{assessment.questions.length}
              </div>
            </div>

            {/* Question Text */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              {currentQuestion.question_text}
            </h2>

            {/* Answer Options - MCQ Single */}
            {currentQuestion.question_type === 'mcq_single' && currentQuestion.options && (
              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected =
                    answers.get(currentQuestion.id)?.selected_options?.includes(option) || false;

                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={isSelected}
                        onChange={() => handleMCQOptionChange(option, false)}
                        data-testid={`option-${optionLetter}`}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium text-gray-500 dark:text-gray-400">{optionLetter}.</span>
                      <span className="flex-1 text-gray-900 dark:text-gray-100">{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Answer Options - MCQ Multiple */}
            {currentQuestion.question_type === 'mcq_multiple' && currentQuestion.options && (
              <div className="space-y-3 mb-8">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Select all that apply (multiple answers may be correct)
                </p>
                {currentQuestion.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index);
                  const isSelected =
                    answers.get(currentQuestion.id)?.selected_options?.includes(option) || false;

                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMCQOptionChange(option, true)}
                        data-testid={`option-${optionLetter}`}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-medium text-gray-500 dark:text-gray-400">{optionLetter}.</span>
                      <span className="flex-1 text-gray-900 dark:text-gray-100">{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Coding Question */}
            {currentQuestion.question_type === 'coding' && (
              <div className="space-y-4 mb-8">
                <div>
                  <Label>Your Code:</Label>
                  <Textarea
                    value={answers.get(currentQuestion.id)?.code || currentQuestion.starter_code || ''}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    data-testid="monaco-editor"
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Write your code here..."
                  />
                </div>

                <Button
                  onClick={handleRunCode}
                  data-testid="run-code-button"
                  disabled={isRunningCode}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {isRunningCode ? 'Running...' : 'Run Code'}
                </Button>

                {/* Code Output */}
                {codeOutput && (
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                    <pre className="whitespace-pre-wrap">{codeOutput}</pre>
                  </div>
                )}

                {/* Test Results */}
                {testResults.length > 0 && (
                  <div className="space-y-2">
                    {testResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-3 rounded ${
                          result.passed ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {result.passed ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        <span>{result.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text Response */}
            {currentQuestion.question_type === 'text' && (
              <div className="mb-8">
                <Label>Your Answer:</Label>
                <Textarea
                  value={answers.get(currentQuestion.id)?.text_response || ''}
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.id, { text_response: e.target.value })
                  }
                  rows={6}
                  placeholder="Type your answer here..."
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t dark:border-gray-700">
              <Button
                onClick={() => handleNavigateQuestion('prev')}
                disabled={currentQuestionIndex === 0}
                data-testid="previous-question-button"
                variant="outline"
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Use sidebar to jump to any question
              </span>

              <Button
                onClick={() => handleNavigateQuestion('next')}
                disabled={currentQuestionIndex === assessment.questions.length - 1}
                data-testid="next-question-button"
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
          </main>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
            <DialogDescription>
              You have answered {getAnsweredCount()}/{assessment.questions.length} questions.
              {getAnsweredCount() < assessment.questions.length && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                  Warning: You have unanswered questions.
                </span>
              )}
              <span className="block mt-2">
                Once submitted, you cannot make changes. Are you sure you want to submit?
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmitAssessment()}
              data-testid="confirm-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Expired Dialog */}
      <Dialog open={showTimeExpiredDialog} onOpenChange={() => {}}>
        <DialogContent data-testid="time-expired-modal">
          <DialogHeader>
            <DialogTitle>Time's up!</DialogTitle>
            <DialogDescription>
              Your assessment has been submitted automatically. You answered {getAnsweredCount()}/
              {assessment.questions.length} questions.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => router.push(`/assessments/${accessToken}/results`)}
            data-testid="view-results-button"
          >
            View Results
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
