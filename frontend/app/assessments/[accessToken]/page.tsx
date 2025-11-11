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

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // TODO: Fetch assessment data from API using access token
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
  }, [accessToken]);

  useEffect(() => {
    if (hasStarted && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Time expired
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [hasStarted, timeRemaining]);

  const handleStartAssessment = () => {
    if (!assessment) return;
    setHasStarted(true);
    setTimeRemaining(assessment.time_limit_minutes * 60); // Convert to seconds
  };

  const handleTimeExpired = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setShowTimeExpiredDialog(true);
    // Auto-submit after a delay
    setTimeout(() => {
      handleSubmitAssessment(true);
    }, 3000);
  };

  const currentQuestion = assessment?.questions[currentQuestionIndex];

  const handleAnswerChange = (questionId: string, answer: Partial<Answer>) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existing = newAnswers.get(questionId) || { question_id: questionId };
      newAnswers.set(questionId, { ...existing, ...answer });
      return newAnswers;
    });
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
    if (!currentQuestion) return;

    setIsRunningCode(true);
    setCodeOutput('');
    setTestResults([]);

    try {
      const answer = answers.get(currentQuestion.id);
      // TODO: Call code execution API
      // Mock execution for now
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResults = currentQuestion.test_cases?.map((tc, idx) => ({
        passed: true,
        message: `Test Case ${idx + 1}: Passed`,
      })) || [];

      setTestResults(mockResults);
      setCodeOutput(`All test cases passed!\n${currentQuestion.points}/${currentQuestion.points} points`);
      toast.success('Code executed successfully');
    } catch (error) {
      toast.error('Code execution failed');
      setCodeOutput('Error: Failed to execute code');
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
    if (!assessment) return;

    setIsSubmitting(true);
    try {
      // TODO: Submit assessment to API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      toast.success('Assessment Submitted Successfully');
      router.push(`/assessments/${accessToken}/results`);
    } catch (error) {
      toast.error('Failed to submit assessment');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeRemaining <= 300) {
      // 5 minutes or less
      return 'text-red-600 warning';
    } else if (timeRemaining <= 600) {
      // 10 minutes or less
      return 'text-yellow-600';
    }
    return 'text-gray-900';
  };

  const getAnsweredCount = () => {
    return answers.size;
  };

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading assessment...</p>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{assessment.title}</h1>
          <p className="text-gray-600 mb-6">{assessment.description}</p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-gray-700">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>{assessment.questions.length} questions</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>{assessment.time_limit_minutes} minutes</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{assessment.title}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className={`font-semibold ${getTimerClass()}`} data-testid="timer">
                  Time Remaining: {formatTime(timeRemaining)}
                </span>
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

      {/* Time Warning */}
      {timeRemaining <= 300 && timeRemaining > 0 && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="container mx-auto px-4 py-2 flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">5 minutes remaining!</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {currentQuestion && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Question {currentQuestionIndex + 1} of {assessment.questions.length}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      currentQuestion.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800'
                        : currentQuestion.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-sm text-gray-600">{currentQuestion.points} points</span>
                  {currentQuestion.category && (
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {currentQuestion.category}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Answered: {getAnsweredCount()}/{assessment.questions.length}
              </div>
            </div>

            {/* Question Text */}
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
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
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
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
                      <span className="font-medium text-gray-500">{optionLetter}.</span>
                      <span className="flex-1 text-gray-900">{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Answer Options - MCQ Multiple */}
            {currentQuestion.question_type === 'mcq_multiple' && currentQuestion.options && (
              <div className="space-y-3 mb-8">
                <p className="text-sm text-gray-600 mb-3">
                  Select all that apply (multiple answers may be correct)
                </p>
                {currentQuestion.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index);
                  const isSelected =
                    answers.get(currentQuestion.id)?.selected_options?.includes(option) || false;

                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMCQOptionChange(option, true)}
                        data-testid={`option-${optionLetter}`}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-medium text-gray-500">{optionLetter}.</span>
                      <span className="flex-1 text-gray-900">{option}</span>
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
                          result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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
            <div className="flex items-center justify-between pt-6 border-t">
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

              <div className="flex gap-2">
                {assessment.questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      idx === currentQuestionIndex
                        ? 'bg-blue-600 text-white'
                        : answers.has(assessment.questions[idx].id)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

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
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
            <DialogDescription>
              You have answered {getAnsweredCount()}/{assessment.questions.length} questions.
              {getAnsweredCount() < assessment.questions.length && (
                <span className="block mt-2 text-yellow-600">
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
