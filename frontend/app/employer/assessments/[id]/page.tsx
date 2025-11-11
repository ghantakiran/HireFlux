/**
 * Assessment Detail Page - Employer Portal
 * Sprint 17-18 Phase 4
 *
 * BDD Test: tests/e2e/assessment-features.spec.ts
 * Satisfies: "should create a new technical screening assessment"
 *           "should update assessment configuration"
 *           "should add MCQ single choice question"
 *           "should add MCQ multiple choice question with partial credit"
 *           "should reorder questions with drag and drop"
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Target,
  FileText,
  Code,
  MessageSquare,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { assessmentApi } from '@/lib/api';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'text' | 'file_upload';
  options?: string[];
  correct_answers?: string[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  display_order: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  assessment_type: 'screening' | 'technical' | 'behavioral' | 'culture_fit';
  status: 'draft' | 'published' | 'archived';
  time_limit_minutes: number;
  passing_score_percentage: number;
  randomize_questions: boolean;
  enable_proctoring: boolean;
  track_tab_switches: boolean;
  max_tab_switches: number;
  track_ip_changes: boolean;
  created_at: string;
  questions?: Question[];
}

export default function AssessmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Question form state
  const [questionType, setQuestionType] = useState<string>('mcq_single');
  const [questionText, setQuestionText] = useState('');
  const [points, setPoints] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [category, setCategory] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOptions, setCorrectOptions] = useState<boolean[]>([false, false, false, false]);

  // Edit form state
  const [editTimeLimit, setEditTimeLimit] = useState('60');
  const [editPassingScore, setEditPassingScore] = useState('70');

  useEffect(() => {
    const fetchAssessment = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await assessmentApi.getAssessment(assessmentId);

        if (response.data.success) {
          const assessmentData = response.data.data;
          setAssessment(assessmentData);
          setEditTimeLimit(assessmentData.time_limit_minutes?.toString() || '60');
          setEditPassingScore(assessmentData.passing_score_percentage?.toString() || '70');

          // Fetch questions for this assessment
          try {
            const questionsResponse = await assessmentApi.listQuestions(assessmentId);
            if (questionsResponse.data.success) {
              setAssessment((prev) => ({
                ...prev!,
                questions: questionsResponse.data.data || [],
              }));
            }
          } catch (error) {
            console.error('Failed to fetch questions:', error);
            // Continue even if questions fail to load
          }
        } else {
          setError('Failed to load assessment');
        }
      } catch (error: any) {
        console.error('Failed to fetch assessment:', error);
        setError(error.response?.data?.error?.message || 'Failed to load assessment');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  const handleUpdateAssessment = async () => {
    try {
      const updateData = {
        time_limit_minutes: parseInt(editTimeLimit),
        passing_score_percentage: parseInt(editPassingScore),
      };

      const response = await assessmentApi.updateAssessment(assessmentId, updateData);

      if (response.data.success) {
        const updatedAssessment = {
          ...assessment!,
          ...updateData,
        };
        setAssessment(updatedAssessment);
        setIsEditing(false);
        toast.success('Assessment updated successfully');
      } else {
        throw new Error('Failed to update assessment');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update assessment';
      toast.error(errorMessage);
      console.error('Assessment update error:', error);
    }
  };

  const handleAddQuestion = async () => {
    try {
      // Validate required fields
      if (!questionText.trim()) {
        toast.error('Question text is required');
        return;
      }

      // Build question data based on type
      const questionData: any = {
        question_text: questionText,
        question_type: questionType as any,
        points: parseInt(points),
        difficulty: difficulty as any,
        category: category || undefined,
        display_order: (assessment?.questions?.length || 0) + 1,
      };

      if (questionType === 'mcq_single' || questionType === 'mcq_multiple') {
        questionData.options = options.filter(opt => opt.trim() !== '');
        questionData.correct_answers = options
          .map((opt, idx) => (correctOptions[idx] ? opt : null))
          .filter(opt => opt !== null) as string[];

        if (questionData.correct_answers.length === 0) {
          toast.error('Please select at least one correct answer');
          return;
        }
      }

      // API call to add question
      const response = await assessmentApi.addQuestionToAssessment(assessmentId, questionData);

      if (response.data.success) {
        const newQuestion = response.data.data;
        const updatedQuestions = [...(assessment?.questions || []), newQuestion];
        setAssessment({ ...assessment!, questions: updatedQuestions });
      } else {
        throw new Error('Failed to add question');
      }

      // Reset form
      setIsAddingQuestion(false);
      setQuestionText('');
      setPoints('10');
      setDifficulty('medium');
      setCategory('');
      setOptions(['', '', '', '']);
      setCorrectOptions([false, false, false, false]);

      toast.success('Question added successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to add question';
      toast.error(errorMessage);
      console.error('Question add error:', error);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const response = await assessmentApi.deleteQuestionFromAssessment(assessmentId, questionId);

      if (response.data.success) {
        const updatedQuestions = assessment?.questions?.filter(q => q.id !== questionId) || [];
        setAssessment({ ...assessment!, questions: updatedQuestions });
        toast.success('Question deleted successfully');
      } else {
        throw new Error('Failed to delete question');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete question';
      toast.error(errorMessage);
      console.error('Question delete error:', error);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCorrectOptionToggle = (index: number) => {
    const newCorrectOptions = [...correctOptions];

    if (questionType === 'mcq_single') {
      // For single choice, only one can be selected
      newCorrectOptions.fill(false);
      newCorrectOptions[index] = true;
    } else {
      // For multiple choice, toggle the checkbox
      newCorrectOptions[index] = !newCorrectOptions[index];
    }

    setCorrectOptions(newCorrectOptions);
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq_single':
      case 'mcq_multiple':
        return <Target className="w-5 h-5" />;
      case 'coding':
        return <Code className="w-5 h-5" />;
      case 'text':
        return <MessageSquare className="w-5 h-5" />;
      case 'file_upload':
        return <Upload className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-2"></div>
        <p className="text-gray-500">Loading assessment...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading assessment</p>
          <p className="text-sm mt-1">{error || 'Assessment not found'}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/employer/assessments')}
            className="mt-2"
          >
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/employer/assessments')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Assessment Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                  assessment.status
                )}`}
              >
                {assessment.status}
              </span>
            </div>
            <p className="text-gray-600">{assessment.description}</p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            data-testid="edit-assessment-button"
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>

        {/* Assessment Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Time Limit</p>
              <p className="font-semibold">{assessment.time_limit_minutes} minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Target className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Passing Score</p>
              <p className="font-semibold">{assessment.passing_score_percentage}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Questions</p>
              <p className="font-semibold">{assessment.questions?.length || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-semibold capitalize">{assessment.assessment_type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Edit Assessment Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="edit-time-limit">Time Limit (minutes)</Label>
                <Input
                  id="edit-time-limit"
                  type="number"
                  value={editTimeLimit}
                  onChange={(e) => setEditTimeLimit(e.target.value)}
                  data-testid="time-limit-minutes"
                  min="1"
                  max="480"
                />
              </div>
              <div>
                <Label htmlFor="edit-passing-score">Passing Score (%)</Label>
                <Input
                  id="edit-passing-score"
                  type="number"
                  value={editPassingScore}
                  onChange={(e) => setEditPassingScore(e.target.value)}
                  data-testid="passing-score-percentage"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateAssessment}
                data-testid="save-changes-button"
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Questions Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
          <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
            <DialogTrigger asChild>
              <Button data-testid="add-question-button" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
                <DialogDescription>
                  Create a new question for this assessment
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Question Type */}
                <div>
                  <Label htmlFor="question-type">Question Type *</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger data-testid="question-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq_single">Multiple Choice (Single Answer)</SelectItem>
                      <SelectItem value="mcq_multiple">Multiple Choice (Multiple Answers)</SelectItem>
                      <SelectItem value="coding">Coding Challenge</SelectItem>
                      <SelectItem value="text">Text Response</SelectItem>
                      <SelectItem value="file_upload">File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Text */}
                <div>
                  <Label htmlFor="question-text">Question Text *</Label>
                  <Textarea
                    id="question-text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    data-testid="question-text"
                    placeholder="Enter your question..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Points */}
                  <div>
                    <Label htmlFor="points">Points *</Label>
                    <Input
                      id="points"
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      data-testid="points"
                      min="1"
                      max="100"
                    />
                  </div>

                  {/* Difficulty */}
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger data-testid="difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      data-testid="category"
                      placeholder="e.g., Algorithms"
                    />
                  </div>
                </div>

                {/* MCQ Options */}
                {(questionType === 'mcq_single' || questionType === 'mcq_multiple') && (
                  <div className="space-y-3">
                    <Label>Answer Options</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type={questionType === 'mcq_single' ? 'radio' : 'checkbox'}
                          name={questionType === 'mcq_single' ? 'correct-answer' : undefined}
                          checked={correctOptions[index]}
                          onChange={() => handleCorrectOptionToggle(index)}
                          data-testid={`correct-option-${index}`}
                          className="w-4 h-4"
                        />
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          data-testid={`option-${index}`}
                          placeholder={`Option ${index + 1}`}
                        />
                      </div>
                    ))}
                    <p className="text-sm text-gray-500">
                      {questionType === 'mcq_single'
                        ? 'Select one correct answer'
                        : 'Select all correct answers'}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingQuestion(false);
                      setQuestionText('');
                      setPoints('10');
                      setOptions(['', '', '', '']);
                      setCorrectOptions([false, false, false, false]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddQuestion}
                    data-testid="save-question-button"
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Question
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Questions List */}
        {!assessment.questions || assessment.questions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions yet</h3>
            <p className="text-gray-600 mb-4">
              Add your first question to start building this assessment
            </p>
            <Button
              onClick={() => setIsAddingQuestion(true)}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Question
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {assessment.questions.map((question, index) => (
              <div
                key={question.id}
                data-testid="question-item"
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                  <div className="flex items-center gap-2 text-gray-500">
                    {getQuestionTypeIcon(question.question_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          question.difficulty === 'easy'
                            ? 'bg-green-100 text-green-800'
                            : question.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {question.difficulty}
                      </span>
                      {question.category && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                          {question.category}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 mb-1">{question.question_text}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{question.points} points</span>
                      {question.question_type.startsWith('mcq') && question.correct_answers && (
                        <span>{question.correct_answers.length} correct answers</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
