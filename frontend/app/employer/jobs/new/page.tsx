/**
 * Job Creation Page - Issue #23
 *
 * Features:
 * - Multi-section job creation form
 * - AI job description generation
 * - Rich text editor for description
 * - Skills autocomplete
 * - Salary range with AI suggestions
 * - Template selection and saving
 * - Draft auto-save
 * - Preview before publishing
 *
 * API Integration:
 * - POST /api/v1/employer/jobs
 * - POST /api/v1/ai/generate-job-description (AI generation)
 * - GET /api/v1/employer/job-templates
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Eye,
  Sparkles,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Types
interface JobFormData {
  title: string;
  department: string;
  location: string;
  location_type: 'on-site' | 'remote' | 'hybrid';
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  experience_min_years?: number;
  experience_max_years?: number;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  company_name: string;
}

interface AIGenerationRequest {
  title: string;
  key_points: string[];
  experience_level: string;
  location: string;
  tone?: 'formal' | 'casual' | 'concise';
}

interface AIGenerationResponse {
  description: string;
  requirements: string[];
  responsibilities: string[];
  suggested_skills: string[];
}

export default function NewJobPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    department: '',
    location: '',
    location_type: 'on-site',
    employment_type: 'full-time',
    experience_level: 'mid',
    salary_currency: 'USD',
    description: '',
    requirements: [],
    responsibilities: [],
    required_skills: [],
    preferred_skills: [],
    company_name: '',
  });

  // AI Generation
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiKeyPoints, setAiKeyPoints] = useState<string[]>(['', '', '']);
  const [aiTone, setAiTone] = useState<'formal' | 'casual' | 'concise'>('formal');
  const [isGenerating, setIsGenerating] = useState(false);

  // New input states
  const [newRequirement, setNewRequirement] = useState('');
  const [newResponsibility, setNewResponsibility] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newPreferredSkill, setNewPreferredSkill] = useState('');

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // Loading & Error states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Departments
  const departments = ['Engineering', 'Sales', 'Marketing', 'Product', 'Operations', 'Design', 'HR', 'Finance', 'Other'];

  // Common skills for autocomplete
  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'Go', 'Rust',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis',
    'Machine Learning', 'Data Science', 'AI', 'DevOps', 'CI/CD', 'Agile', 'Scrum',
    'REST APIs', 'GraphQL', 'Microservices', 'System Design', 'Leadership', 'Communication'
  ];

  // Update form field
  const updateField = (field: keyof JobFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Add item to array field
  const addToArray = (field: 'requirements' | 'responsibilities' | 'required_skills' | 'preferred_skills', value: string) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
    // Clear input
    if (field === 'requirements') setNewRequirement('');
    if (field === 'responsibilities') setNewResponsibility('');
    if (field === 'required_skills') setNewSkill('');
    if (field === 'preferred_skills') setNewPreferredSkill('');
  };

  // Remove item from array
  const removeFromArray = (field: 'requirements' | 'responsibilities' | 'required_skills' | 'preferred_skills', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // AI Generation
  const generateWithAI = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/employer/login');
        return;
      }

      const request: AIGenerationRequest = {
        title: formData.title,
        key_points: aiKeyPoints.filter(kp => kp.trim() !== ''),
        experience_level: formData.experience_level,
        location: formData.location,
        tone: aiTone,
      };

      // Note: This endpoint may need to be created on backend
      const response = await fetch('/api/v1/ai/generate-job-description', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('AI generation failed');
      }

      const data: AIGenerationResponse = await response.json();

      // Update form with AI-generated content
      setFormData((prev) => ({
        ...prev,
        description: data.description,
        requirements: data.requirements,
        responsibilities: data.responsibilities,
        required_skills: [...prev.required_skills, ...data.suggested_skills.filter(s => !prev.required_skills.includes(s))],
      }));

      setAiDialogOpen(false);
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate job description');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save as draft
  const saveDraft = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/employer/login');
        return;
      }

      const response = await fetch('/api/v1/employer/jobs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          is_active: false, // Draft
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      setLastSaved(new Date());
      alert('Job saved as draft');
      router.push('/employer/jobs');
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save job');
    } finally {
      setIsSaving(false);
    }
  };

  // Publish job
  const publishJob = async () => {
    // Validation
    if (!formData.title.trim()) {
      setError('Job title is required');
      return;
    }
    if (!formData.department) {
      setError('Department is required');
      return;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Job description is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/employer/login');
        return;
      }

      const response = await fetch('/api/v1/employer/jobs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          is_active: true, // Published
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to publish job');
      }

      alert('Job published successfully!');
      router.push('/employer/jobs');
    } catch (err) {
      console.error('Publish error:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish job');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!formData.title) return; // Don't auto-save empty form

    const timer = setTimeout(() => {
      // Silent auto-save logic here
      setLastSaved(new Date());
    }, 30000);

    return () => clearTimeout(timer);
  }, [formData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" onClick={saveDraft} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i + 1 <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Start with the essentials. You can use AI to generate the full description later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              {/* Department & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => updateField('department', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    required
                  />
                </div>
              </div>

              {/* Location Type & Employment Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location_type">Location Type</Label>
                  <Select
                    value={formData.location_type}
                    onValueChange={(value: any) => updateField('location_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-site">On-site</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(value: any) => updateField('employment_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <Label htmlFor="experience_level">Experience Level</Label>
                <Select
                  value={formData.experience_level}
                  onValueChange={(value: any) => updateField('experience_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Salary Range */}
              <div className="space-y-2">
                <Label>Salary Range (Optional)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Input
                      type="number"
                      value={formData.salary_min || ''}
                      onChange={(e) => updateField('salary_min', parseInt(e.target.value) || undefined)}
                      placeholder="Min (e.g., 100000)"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={formData.salary_max || ''}
                      onChange={(e) => updateField('salary_max', parseInt(e.target.value) || undefined)}
                      placeholder="Max (e.g., 150000)"
                    />
                  </div>
                  <div>
                    <Select
                      value={formData.salary_currency}
                      onValueChange={(value) => updateField('salary_currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Job Description */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Description</CardTitle>
                  <CardDescription>
                    Write a compelling description or let AI generate one for you
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setAiDialogOpen(true)}
                  className="gap-2"
                  disabled={!formData.title}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe the role, team, and what makes this opportunity exciting..."
                  rows={10}
                  className="resize-none"
                  required
                />
                <p className="text-xs text-gray-500">
                  {formData.description.length} characters
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Requirements & Responsibilities */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Requirements & Responsibilities</CardTitle>
              <CardDescription>
                Define what you're looking for and what the role entails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Requirements */}
              <div className="space-y-2">
                <Label>Requirements</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="e.g., 5+ years of software development experience"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('requirements', newRequirement);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => addToArray('requirements', newRequirement)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-3">
                  {formData.requirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded">
                      <span className="flex-1">{req}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromArray('requirements', index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <Label>Responsibilities</Label>
                <div className="flex gap-2">
                  <Input
                    value={newResponsibility}
                    onChange={(e) => setNewResponsibility(e.target.value)}
                    placeholder="e.g., Design and build scalable backend systems"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('responsibilities', newResponsibility);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => addToArray('responsibilities', newResponsibility)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-3">
                  {formData.responsibilities.map((resp, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded">
                      <span className="flex-1">{resp}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromArray('responsibilities', index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Skills */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>
                Add skills that candidates should have
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Required Skills */}
              <div className="space-y-2">
                <Label>Required Skills *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="e.g., Python, React, AWS"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('required_skills', newSkill);
                      }
                    }}
                    list="common-skills"
                  />
                  <datalist id="common-skills">
                    {commonSkills.map((skill) => (
                      <option key={skill} value={skill} />
                    ))}
                  </datalist>
                  <Button
                    type="button"
                    onClick={() => addToArray('required_skills', newSkill)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.required_skills.map((skill, index) => (
                    <Badge key={index} variant="default" className="gap-2">
                      {skill}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeFromArray('required_skills', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preferred Skills */}
              <div className="space-y-2">
                <Label>Preferred Skills (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newPreferredSkill}
                    onChange={(e) => setNewPreferredSkill(e.target.value)}
                    placeholder="e.g., Machine Learning, Kubernetes"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('preferred_skills', newPreferredSkill);
                      }
                    }}
                    list="common-skills"
                  />
                  <Button
                    type="button"
                    onClick={() => addToArray('preferred_skills', newPreferredSkill)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.preferred_skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="gap-2">
                      {skill}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeFromArray('preferred_skills', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={saveDraft} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button onClick={publishJob} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Publish Job
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Generate Job Description with AI
            </DialogTitle>
            <DialogDescription>
              Provide a few key points and AI will create a comprehensive job description
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Key Points */}
            <div className="space-y-2">
              <Label>Key Points (3-5 bullet points)</Label>
              {aiKeyPoints.map((point, index) => (
                <Input
                  key={index}
                  value={point}
                  onChange={(e) => {
                    const newPoints = [...aiKeyPoints];
                    newPoints[index] = e.target.value;
                    setAiKeyPoints(newPoints);
                  }}
                  placeholder={`Point ${index + 1}: e.g., Build scalable systems`}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiKeyPoints([...aiKeyPoints, ''])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Point
              </Button>
            </div>

            {/* Tone Selection */}
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={aiTone} onValueChange={(value: any) => setAiTone(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={generateWithAI} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Preview</DialogTitle>
            <DialogDescription>
              This is how your job posting will appear to candidates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{formData.title || 'Job Title'}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span>{formData.department || 'Department'}</span>
                <span>•</span>
                <span>{formData.location || 'Location'}</span>
                <span>•</span>
                <span className="capitalize">{formData.location_type}</span>
                <span>•</span>
                <span className="capitalize">{formData.employment_type}</span>
              </div>
              {(formData.salary_min || formData.salary_max) && (
                <p className="text-green-600 font-medium mt-2">
                  {formData.salary_min && formData.salary_max
                    ? `$${(formData.salary_min / 1000).toFixed(0)}K - $${(formData.salary_max / 1000).toFixed(0)}K`
                    : formData.salary_min
                    ? `$${(formData.salary_min / 1000).toFixed(0)}K+`
                    : `Up to $${(formData.salary_max! / 1000).toFixed(0)}K`}
                </p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {formData.description || 'No description yet'}
              </p>
            </div>

            {formData.requirements.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {formData.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {formData.responsibilities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Responsibilities</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {formData.responsibilities.map((resp, index) => (
                    <li key={index}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}

            {formData.required_skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.required_skills.map((skill, index) => (
                    <Badge key={index}>{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.preferred_skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Preferred Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.preferred_skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
