'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Mic,
  MicOff,
  RotateCcw,
  Star,
  Clock,
  CheckCircle,
  Play,
  Pause,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  AlertCircle,
  Loader2,
  BookOpen,
  TrendingUp,
  Award,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
type InterviewType = 'technical' | 'behavioral' | 'system-design' | 'product' | 'leadership';
type RoleLevel = 'junior' | 'mid' | 'senior' | 'staff';
type CompanyType = 'faang' | 'tech' | 'enterprise' | 'fintech' | 'healthcare';
type FocusArea = 'python' | 'frontend' | 'fullstack' | 'devops' | 'data';
type PracticeMode = 'timed' | 'untimed';
type SessionLength = 3 | 5 | 10;

interface SessionConfig {
  interviewType: InterviewType;
  roleLevel: RoleLevel;
  companyType: CompanyType;
  focusArea: FocusArea;
  mode: PracticeMode;
  sessionLength: SessionLength;
}

interface Question {
  id: string;
  number: number;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  timeLimit: number; // seconds
  category: string;
}

interface Answer {
  questionId: string;
  text: string;
  isVoice: boolean;
  duration: number; // seconds
  timestamp: Date;
}

interface STARAnalysis {
  situation: { present: boolean; score: number; feedback: string };
  task: { present: boolean; score: number; feedback: string };
  action: { present: boolean; score: number; feedback: string };
  result: { present: boolean; score: number; feedback: string };
}

interface FeedbackCriteria {
  clarity: number;
  completeness: number;
  relevance: number;
  starAlignment: number;
  communication: number;
}

interface AIFeedback {
  overallScore: number;
  starAnalysis: STARAnalysis;
  criteria: FeedbackCriteria;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
}

interface SessionResult {
  sessionId: string;
  config: SessionConfig;
  questions: Question[];
  answers: Answer[];
  feedback: Map<string, AIFeedback>;
  overallScore: number;
  completedAt: Date;
  duration: number; // seconds
}

interface SessionStats {
  sessionsCompleted: number;
  averageScore: number;
  questionsAnswered: number;
  improvementRate: number;
  byType: Record<InterviewType, number>;
}

interface PastSession {
  id: string;
  type: InterviewType;
  company: string;
  role: string;
  score: number;
  date: Date;
}

export default function InterviewCoachPage() {
  const router = useRouter();

  // Session Configuration State
  const [config, setConfig] = useState<SessionConfig>({
    interviewType: 'technical',
    roleLevel: 'senior',
    companyType: 'tech',
    focusArea: 'python',
    mode: 'timed',
    sessionLength: 5,
  });

  // Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Timer State
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionTimeElapsed, setSessionTimeElapsed] = useState(0);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Feedback State
  const [currentFeedback, setCurrentFeedback] = useState<AIFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Session Completion State
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionResults, setSessionResults] = useState<SessionResult | null>(null);

  // UI State
  const [isPaused, setIsPaused] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSampleComparison, setShowSampleComparison] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // Stats & History
  const [stats, setStats] = useState<SessionStats>({
    sessionsCompleted: 23,
    averageScore: 8.2,
    questionsAnswered: 156,
    improvementRate: 15,
    byType: {
      technical: 12,
      behavioral: 6,
      'system-design': 3,
      product: 1,
      leadership: 1,
    },
  });

  const [pastSessions, setPastSessions] = useState<PastSession[]>([
    {
      id: '1',
      type: 'technical',
      company: 'Google',
      role: 'Senior Engineer',
      score: 8.5,
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      type: 'system-design',
      company: 'Meta',
      role: 'Staff Engineer',
      score: 7.8,
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      type: 'behavioral',
      company: 'Stripe',
      role: 'Senior Engineer',
      score: 9.1,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Current question helper
  const currentQuestion = questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || isPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          setIsTimerRunning(false);
          toast.warning("Time's up!", {
            description: 'You can still continue or submit your answer.',
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, isPaused]);

  // Session timer effect
  useEffect(() => {
    if (!isSessionActive || isPaused) return;

    const timer = setInterval(() => {
      setSessionTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, isPaused]);

  // Recording duration timer
  useEffect(() => {
    if (!isRecording) return;

    const timer = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  // Auto-save answer
  useEffect(() => {
    if (!currentQuestion || !currentAnswer) return;

    const timeout = setTimeout(() => {
      // Auto-save logic here
      console.log('Auto-saving answer...');
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentAnswer, currentQuestion]);

  // Generate mock questions
  const generateQuestions = (config: SessionConfig): Question[] => {
    const questionTemplates = {
      technical: [
        'Explain how you would optimize a slow database query in a production system.',
        'Design a rate limiting system for an API with 1 million requests per second.',
        'How would you debug a memory leak in a Node.js application?',
        'Implement a caching strategy for a high-traffic web application.',
        'Describe your approach to handling concurrent requests in a distributed system.',
      ],
      behavioral: [
        'Tell me about a time when you had to deal with a difficult team member.',
        'Describe a situation where you had to make a decision with incomplete information.',
        'Give an example of when you failed and what you learned from it.',
        'Tell me about a time when you had to influence someone without authority.',
        'Describe a complex project you led from start to finish.',
      ],
      'system-design': [
        'Design a URL shortener service like bit.ly that can handle 1 billion URLs.',
        'How would you design a real-time chat application like WhatsApp?',
        'Design a content delivery network (CDN) from scratch.',
        'How would you design Instagram\'s feed ranking system?',
        'Design a distributed key-value store like DynamoDB.',
      ],
      product: [
        'How would you improve the user onboarding experience for our product?',
        'You notice a 20% drop in user engagement. How do you investigate?',
        'How would you prioritize features when you have limited engineering resources?',
        'Design a feature to increase user retention by 15%.',
        'How do you balance technical debt with new feature development?',
      ],
      leadership: [
        'How do you handle underperforming team members?',
        'Describe your approach to building and scaling engineering teams.',
        'How do you ensure alignment between engineering and business goals?',
        'Tell me about a time you had to make an unpopular decision.',
        'How do you foster innovation while maintaining stability?',
      ],
    };

    const templates = questionTemplates[config.interviewType];
    const selectedQuestions = templates.slice(0, config.sessionLength);

    return selectedQuestions.map((text, index) => ({
      id: `q${index + 1}`,
      number: index + 1,
      text,
      difficulty: index < 2 ? 'medium' : index < 4 ? 'hard' : 'expert',
      timeLimit: config.mode === 'timed' ? 120 : 0,
      category: config.interviewType,
    }));
  };

  // Generate mock AI feedback
  const generateFeedback = (answer: string, question: Question): AIFeedback => {
    const hasSubstantialContent = answer.length > 50;

    const starAnalysis: STARAnalysis = {
      situation: {
        present: hasSubstantialContent && answer.toLowerCase().includes('situation'),
        score: hasSubstantialContent ? 85 : 60,
        feedback: hasSubstantialContent
          ? 'Good context setting with clear situation description.'
          : 'Try to provide more context about the situation.',
      },
      task: {
        present: hasSubstantialContent && answer.toLowerCase().includes('task'),
        score: hasSubstantialContent ? 80 : 55,
        feedback: hasSubstantialContent
          ? 'Clear explanation of your responsibilities.'
          : 'Define your specific responsibilities more clearly.',
      },
      action: {
        present: hasSubstantialContent,
        score: hasSubstantialContent ? 90 : 65,
        feedback: hasSubstantialContent
          ? 'Excellent detail on actions taken.'
          : 'Provide more specific actions you took.',
      },
      result: {
        present: hasSubstantialContent && answer.toLowerCase().includes('result'),
        score: hasSubstantialContent ? 87 : 60,
        feedback: hasSubstantialContent
          ? 'Good quantifiable results mentioned.'
          : 'Include measurable outcomes and impact.',
      },
    };

    const criteria: FeedbackCriteria = {
      clarity: hasSubstantialContent ? 88 : 65,
      completeness: hasSubstantialContent ? 85 : 60,
      relevance: hasSubstantialContent ? 90 : 70,
      starAlignment: hasSubstantialContent ? 84 : 58,
      communication: hasSubstantialContent ? 87 : 68,
    };

    const overallScore =
      (criteria.clarity * 0.25 +
        criteria.completeness * 0.2 +
        criteria.relevance * 0.2 +
        criteria.starAlignment * 0.2 +
        criteria.communication * 0.15) /
      10;

    const strengths = hasSubstantialContent
      ? [
          'Strong quantitative approach with specific metrics',
          'Good use of technical terminology',
          'Clear problem-solving methodology demonstrated',
        ]
      : ['Attempted to answer the question', 'Basic understanding shown'];

    const improvements = hasSubstantialContent
      ? [
          'Consider mentioning stakeholder alignment',
          'Could elaborate more on challenges faced',
          'Add more specific examples',
        ]
      : [
          'Provide more detailed answer with STAR framework',
          'Include specific examples and metrics',
          'Demonstrate deeper technical knowledge',
        ];

    const sampleAnswer = `I'd approach this by first analyzing the current ${question.category} to identify bottlenecks.

**Situation**: In my previous role at TechCorp, we faced similar challenges with ${question.text.substring(0, 50)}...

**Task**: My responsibility was to lead the initiative and deliver results within 30 days.

**Action**: I implemented a three-pronged strategy:
1. Early stakeholder mapping and engagement
2. Customized demonstrations within the first week
3. Streamlined implementation process

**Result**: This approach reduced our timeline by 40% and increased success rate by 25%.`;

    return {
      overallScore,
      starAnalysis,
      criteria,
      strengths,
      improvements,
      sampleAnswer,
    };
  };

  // Start session
  const handleStartSession = async (mockMode = false) => {
    setIsLoading(true);
    setIsMockMode(mockMode);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const generatedQuestions = generateQuestions(config);
      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setIsSessionActive(true);
      setSessionStartTime(new Date());
      setAnswers(new Map());
      setCurrentAnswer('');
      setShowFeedback(false);

      if (config.mode === 'timed') {
        setTimeRemaining(generatedQuestions[0].timeLimit);
        setIsTimerRunning(true);
      }

      toast.success('Session started!', {
        description: `${config.sessionLength} questions loaded`,
      });
    } catch (error) {
      toast.error('Failed to start session', {
        description: 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentAnswer.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    setFeedbackLoading(true);

    try {
      // Simulate AI feedback generation
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const feedback = generateFeedback(currentAnswer, currentQuestion);
      setCurrentFeedback(feedback);
      setShowFeedback(true);

      // Save answer
      const answer: Answer = {
        questionId: currentQuestion.id,
        text: currentAnswer,
        isVoice: false,
        duration: currentQuestion.timeLimit - timeRemaining,
        timestamp: new Date(),
      };

      setAnswers((prev) => new Map(prev).set(currentQuestion.id, answer));

      toast.success('Answer submitted!', {
        description: `Score: ${feedback.overallScore.toFixed(1)}/10`,
      });
    } catch (error) {
      toast.error('Failed to get feedback', {
        description: 'Please try again',
      });
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentAnswer('');
      setCurrentFeedback(null);
      setShowFeedback(false);

      if (config.mode === 'timed') {
        setTimeRemaining(questions[currentQuestionIndex + 1].timeLimit);
        setIsTimerRunning(true);
      }
    } else {
      handleCompleteSession();
    }
  };

  // Previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      const prevAnswer = answers.get(questions[currentQuestionIndex - 1].id);
      setCurrentAnswer(prevAnswer?.text || '');
      setShowFeedback(false);
    }
  };

  // Skip question
  const handleSkipQuestion = () => {
    setShowSkipDialog(false);
    handleNextQuestion();
  };

  // Complete session
  const handleCompleteSession = () => {
    setIsSessionActive(false);
    setIsTimerRunning(false);
    setIsSessionComplete(true);

    // Calculate results
    const feedbackMap = new Map<string, AIFeedback>();
    let totalScore = 0;

    questions.forEach((q) => {
      const answer = answers.get(q.id);
      if (answer) {
        const feedback = generateFeedback(answer.text, q);
        feedbackMap.set(q.id, feedback);
        totalScore += feedback.overallScore;
      }
    });

    const results: SessionResult = {
      sessionId: `session-${Date.now()}`,
      config,
      questions,
      answers: Array.from(answers.values()),
      feedback: feedbackMap,
      overallScore: totalScore / questions.length,
      completedAt: new Date(),
      duration: sessionTimeElapsed,
    };

    setSessionResults(results);

    toast.success('Session completed!', {
      description: `Overall score: ${results.overallScore.toFixed(1)}/10`,
    });
  };

  // Voice recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });

        // Simulate transcription
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const transcription = `[Transcribed from voice recording - ${recordingDuration}s]: This is a simulated transcription of the voice answer. In a production environment, this would be the actual transcribed text from the speech-to-text service.`;

        setCurrentAnswer((prev) => prev + '\n\n' + transcription);
        toast.success('Recording transcribed!', {
          description: `${recordingDuration}s recorded`,
        });

        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      setHasPermission(false);
      toast.error('Microphone access denied', {
        description: 'Please enable microphone in browser settings',
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Pause/Resume session
  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? 'Session resumed' : 'Session paused');
  };

  // Reset answer
  const handleResetAnswer = () => {
    if (currentAnswer.length > 20) {
      if (confirm('Are you sure you want to clear your answer?')) {
        setCurrentAnswer('');
      }
    } else {
      setCurrentAnswer('');
    }
  };

  // Extend time
  const handleExtendTime = () => {
    setTimeRemaining((prev) => prev + 60);
    setIsTimerRunning(true);
    toast.success('Added 1 minute');
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return `${Math.floor(diffMs / (1000 * 60))} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffHours < 48) return 'Yesterday';
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  // Export results
  const handleExportResults = (format: 'pdf' | 'csv') => {
    if (!sessionResults) return;

    const filename = `interview-session-${sessionResults.sessionId}.${format}`;

    if (format === 'csv') {
      const csvContent = `Question,Answer,Score\n${questions
        .map((q) => {
          const answer = answers.get(q.id);
          const feedback = sessionResults.feedback.get(q.id);
          return `"${q.text}","${answer?.text || 'N/A'}","${feedback?.overallScore.toFixed(1) || 'N/A'}"`;
        })
        .join('\n')}`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Exported as CSV');
    }
  };

  // Share results
  const handleShareResults = () => {
    const shareUrl = `${window.location.origin}/share/session/${sessionResults?.sessionId}`;

    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!', {
      description: 'Anyone with the link can view your results',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" data-loading-indicator>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Generating interview questions...</p>
        </div>
      </div>
    );
  }

  // Session complete state
  if (isSessionComplete && sessionResults) {
    return (
      <div className="container mx-auto px-4 py-8" data-session-complete>
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
          <p className="text-muted-foreground">
            Great job! Here's how you performed.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8" data-session-results>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600" data-overall-score>
                {sessionResults.overallScore.toFixed(1)}/10
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600" data-questions-answered>
                {sessionResults.answers.length}/{questions.length}
              </div>
              <div className="text-sm text-muted-foreground">Questions Answered</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600" data-average-time>
                {formatTime(sessionResults.duration)}
              </div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Math.round((sessionResults.answers.length / questions.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Overall Strengths
              </CardTitle>
            </CardHeader>
            <CardContent data-strengths-summary>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span className="text-sm">Consistent STAR framework usage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span className="text-sm">Good technical depth in answers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span className="text-sm">Clear communication style</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent data-areas-improve>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <span className="text-sm">Add more quantifiable results</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <span className="text-sm">Elaborate on challenges faced</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <span className="text-sm">Mention stakeholder alignment</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* All Questions & Feedback */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detailed Question Review</CardTitle>
          </CardHeader>
          <CardContent data-results-questions>
            <div className="space-y-6">
              {questions.map((question, index) => {
                const answer = answers.get(question.id);
                const feedback = sessionResults.feedback.get(question.id);

                return (
                  <div
                    key={question.id}
                    className="border rounded-lg p-4"
                    data-result-question
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">
                          Question {question.number}: {question.text}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{question.difficulty}</Badge>
                        </div>
                      </div>
                      {feedback && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {feedback.overallScore.toFixed(1)}/10
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div data-user-answer>
                        <Label className="text-sm font-medium">Your Answer:</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {answer?.text || 'Not answered'}
                        </p>
                      </div>

                      {feedback && (
                        <>
                          <div data-feedback>
                            <Label className="text-sm font-medium">AI Feedback:</Label>
                            <div className="mt-2 space-y-2">
                              <div className="text-sm">
                                <span className="font-medium text-green-700">Strengths:</span>
                                <ul className="ml-4 mt-1">
                                  {feedback.strengths.map((s, i) => (
                                    <li key={i} className="text-xs">
                                      • {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-orange-700">
                                  Improvements:
                                </span>
                                <ul className="ml-4 mt-1">
                                  {feedback.improvements.map((s, i) => (
                                    <li key={i} className="text-xs">
                                      • {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div data-sample-answer>
                            <Label className="text-sm font-medium">Sample Answer:</Label>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {feedback.sampleAnswer}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start New Session
          </Button>
          <Button variant="outline" onClick={() => handleExportResults('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button variant="outline" onClick={handleShareResults} data-share-link>
            <Share2 className="h-4 w-4 mr-2" />
            Share Results
          </Button>
        </div>
      </div>
    );
  }

  // Active session state
  if (isSessionActive && currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8" data-practice-interface>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isMockMode ? 'Mock Interview' : 'Practice Session'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {config.interviewType} • {config.roleLevel} • {config.companyType}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Session Timer (Mock Mode) */}
            {isMockMode && (
              <Badge variant="secondary" className="text-lg" data-session-timer>
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(sessionTimeElapsed)}
              </Badge>
            )}

            {/* Pause/Resume */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseResume}
              disabled={!config.mode}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6" data-progress-indicator>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" data-question-number>
              Question {currentQuestion.number} of {questions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((currentQuestion.number - 1) / questions.length) * 100)}%
              complete
            </span>
          </div>
          <Progress value={((currentQuestion.number - 1) / questions.length) * 100} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Question & Answer Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Card */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">{currentQuestion.difficulty}</Badge>
                    {config.mode === 'timed' && (
                      <div
                        className={`flex items-center gap-2 ${
                          timeRemaining <= 30 ? 'text-red-600 font-bold' : ''
                        }`}
                        data-timer
                      >
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(timeRemaining)}</span>
                        {timeRemaining === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExtendTime}
                          >
                            +1 min
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-lg font-medium" data-question-text>
                    {currentQuestion.text}
                  </p>
                </div>

                {/* Answer Input */}
                <div className="space-y-3">
                  <Label>Your Answer</Label>
                  <Textarea
                    data-answer-input
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here or use voice input..."
                    rows={8}
                    className="resize-none"
                    disabled={isPaused}
                  />

                  {/* Word/Character Count */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      <span data-character-count>{currentAnswer.length} characters</span>
                      <span className="mx-2">•</span>
                      <span data-word-count>
                        {currentAnswer.split(/\s+/).filter((w) => w).length} words
                      </span>
                    </div>
                    {currentAnswer.split(/\s+/).filter((w) => w).length > 500 && (
                      <span className="text-orange-600 font-medium" data-word-warning>
                        ⚠ Consider keeping it concise
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      variant={isRecording ? 'destructive' : 'default'}
                      disabled={isPaused}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-4 w-4 mr-2" />
                          Stop Recording ({formatTime(recordingDuration)})
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Voice Input
                        </>
                      )}
                    </Button>

                    {isRecording && (
                      <div
                        className="flex items-center gap-2 text-red-600 animate-pulse"
                        data-recording-indicator
                      >
                        <div className="w-3 h-3 bg-red-600 rounded-full" />
                        <span data-recording-status>Recording...</span>
                        <span data-recording-timer>{formatTime(recordingDuration)}</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={handleResetAnswer}
                      disabled={isPaused}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>

                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!currentAnswer.trim() || isPaused || feedbackLoading}
                    >
                      {feedbackLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Submit Answer'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Feedback */}
            {showFeedback && currentFeedback && (
              <Card data-ai-feedback>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-blue-600" />
                      AI Feedback
                    </CardTitle>
                    <Badge
                      className="text-lg"
                      variant="secondary"
                      data-feedback-score
                    >
                      {currentFeedback.overallScore.toFixed(1)}/10
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* STAR Analysis */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      STAR Framework Analysis
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(currentFeedback.starAnalysis).map(([key, value]) => (
                        <div
                          key={key}
                          className="p-3 bg-gray-50 rounded"
                          data-star-{key.toLowerCase()}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize">{key}</span>
                            <span
                              className={`text-xs ${
                                value.present ? 'text-green-600' : 'text-gray-400'
                              }`}
                            >
                              {value.score}/100
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{value.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Criteria Breakdown */}
                  <div data-feedback-breakdown>
                    <Label className="text-sm font-medium mb-2 block">
                      Score Breakdown
                    </Label>
                    <div className="space-y-2">
                      {Object.entries(currentFeedback.criteria).map(([key, value]) => (
                        <div key={key} data-criteria-{key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-xs font-medium">
                              {value.toFixed(0)}/100
                            </span>
                          </div>
                          <Progress value={value} className="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div data-feedback-strengths>
                    <Label className="text-sm font-medium text-green-700 mb-2 block">
                      Strengths
                    </Label>
                    <ul className="space-y-1">
                      {currentFeedback.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div data-feedback-improvements>
                    <Label className="text-sm font-medium text-orange-700 mb-2 block">
                      Areas for Improvement
                    </Label>
                    <ul className="space-y-1">
                      {currentFeedback.improvements.map((improvement, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sample Answer */}
            {showFeedback && currentFeedback && (
              <Card data-sample-answer>
                <CardHeader>
                  <CardTitle>Sample Answer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {currentFeedback.sampleAnswer}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0 || isPaused}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowSkipDialog(true)}
                disabled={isPaused}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>

              <Button
                onClick={handleNextQuestion}
                disabled={!answers.has(currentQuestion.id) || isPaused}
                className="ml-auto"
              >
                {currentQuestionIndex === questions.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finish Session
                  </>
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="font-medium capitalize">{config.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress:</span>
                  <span className="font-medium">
                    {answers.size}/{questions.length} answered
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Elapsed:</span>
                  <span className="font-medium">{formatTime(sessionTimeElapsed)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  STAR Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">S</span>ituation: Set the context
                </div>
                <div>
                  <span className="font-medium">T</span>ask: Explain your responsibility
                </div>
                <div>
                  <span className="font-medium">A</span>ction: Describe what you did
                </div>
                <div>
                  <span className="font-medium">R</span>esult: Share the outcome
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Skip Dialog */}
        <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skip Question?</DialogTitle>
              <DialogDescription>
                You haven't answered this question yet. Are you sure you want to skip?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSkipQuestion}>Skip Question</Button>
            </DialogFooter>
          </Dialog>
        </Dialog>

        {/* Microphone Permission Error */}
        {hasPermission === false && (
          <div
            className="fixed bottom-4 right-4 max-w-sm"
            data-error-message
            role="alert"
          >
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800 mb-1">
                      Microphone Access Denied
                    </h4>
                    <p className="text-sm text-red-700 mb-2">
                      Please enable microphone in your browser settings to use voice
                      input.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHasPermission(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Default/Setup State
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Interview Coach</h1>
          <Badge variant="secondary" className="ml-auto">
            <Star className="h-3 w-3 mr-1" />
            4.7 • 387 Ratings
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Practice interviews with AI-powered coaching and STAR framework feedback
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card data-interview-settings>
            <CardHeader>
              <CardTitle>Interview Settings</CardTitle>
              <CardDescription>Configure your practice session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Interview Type */}
              <div>
                <Label className="text-sm font-medium">Interview Type</Label>
                <Select
                  value={config.interviewType}
                  onValueChange={(value) =>
                    setConfig({ ...config, interviewType: value as InterviewType })
                  }
                >
                  <SelectTrigger data-interview-type-select>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Interview</SelectItem>
                    <SelectItem value="behavioral">Behavioral Interview</SelectItem>
                    <SelectItem value="system-design">System Design</SelectItem>
                    <SelectItem value="product">Product Management</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Level */}
              <div>
                <Label className="text-sm font-medium">Role Level</Label>
                <Select
                  value={config.roleLevel}
                  onValueChange={(value) =>
                    setConfig({ ...config, roleLevel: value as RoleLevel })
                  }
                >
                  <SelectTrigger data-role-level-select>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid-Level (3-5 years)</SelectItem>
                    <SelectItem value="senior">Senior (6+ years)</SelectItem>
                    <SelectItem value="staff">Staff/Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company Type */}
              <div>
                <Label className="text-sm font-medium">Company Type</Label>
                <Select
                  value={config.companyType}
                  onValueChange={(value) =>
                    setConfig({ ...config, companyType: value as CompanyType })
                  }
                >
                  <SelectTrigger data-company-type-select>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faang">FAANG</SelectItem>
                    <SelectItem value="tech">Tech Startup</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Focus Area */}
              <div>
                <Label className="text-sm font-medium">Focus Area</Label>
                <Select
                  value={config.focusArea}
                  onValueChange={(value) =>
                    setConfig({ ...config, focusArea: value as FocusArea })
                  }
                >
                  <SelectTrigger data-focus-area-select>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python & Backend</SelectItem>
                    <SelectItem value="frontend">Frontend Development</SelectItem>
                    <SelectItem value="fullstack">Full Stack</SelectItem>
                    <SelectItem value="devops">DevOps & Cloud</SelectItem>
                    <SelectItem value="data">Data Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Practice Mode */}
              <div>
                <Label className="text-sm font-medium">Practice Mode</Label>
                <Select
                  value={config.mode}
                  onValueChange={(value) =>
                    setConfig({ ...config, mode: value as PracticeMode })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timed">Timed Practice</SelectItem>
                    <SelectItem value="untimed">Untimed Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Session Length */}
              <div>
                <Label className="text-sm font-medium">Session Length</Label>
                <Select
                  value={config.sessionLength.toString()}
                  onValueChange={(value) =>
                    setConfig({ ...config, sessionLength: parseInt(value) as SessionLength })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Quick Practice (3 questions)</SelectItem>
                    <SelectItem value="5">Standard (5 questions)</SelectItem>
                    <SelectItem value="10">Full Interview (10 questions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Session Stats */}
          <Card data-session-stats>
            <CardHeader>
              <CardTitle>Your Performance</CardTitle>
              <CardDescription>Practice statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" data-stat-sessions-completed>
                  Sessions Completed
                </span>
                <span className="font-semibold">{stats.sessionsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" data-stat-average-score>
                  Average Score
                </span>
                <span className="font-semibold text-green-600">
                  {stats.averageScore.toFixed(1)}/10
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" data-stat-questions-answered>
                  Questions Answered
                </span>
                <span className="font-semibold">{stats.questionsAnswered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" data-stat-improvement-rate>
                  Improvement Rate
                </span>
                <span className="font-semibold text-blue-600">
                  +{stats.improvementRate}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => handleStartSession(false)}>
                <Play className="h-4 w-4 mr-2" />
                Start Practice
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleStartSession(true)}
                data-mock-interview-mode
              >
                <Users className="h-4 w-4 mr-2" />
                Mock Interview
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard/interview-buddy/history')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View History
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-2">
          <Card data-session-history>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your interview practice history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    data-session-item
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold capitalize" data-session-type>
                        {session.type.replace('-', ' ')} Interview
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {session.company} • {session.role} •{' '}
                        <span data-session-date>{formatDate(session.date)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                        data-session-score
                      >
                        {session.score.toFixed(1)}/10
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/interview-buddy/session/${session.id}`)
                        }
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
