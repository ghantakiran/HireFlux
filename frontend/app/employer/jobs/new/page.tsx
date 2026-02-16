/**
 * Job Creation Wizard - Issue #79
 *
 * Features:
 * - 5-step wizard (Basics → Description → Requirements → Compensation → Review)
 * - AI job description generation
 * - Per-section validation
 * - Draft auto-save
 * - Job preview
 * - All E2E test data attributes
 *
 * Related: Issue #23 (original), Issue #79 (TDD/BDD enhancement)
 * API Integration: Uses lib/api/jobs.ts
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createJob,
  generateJobDescription,
  type JobCreateRequest,
  type ExperienceLevel,
  type LocationType,
  type EmploymentType,
} from '@/lib/api/jobs';
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
  Check,
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
import { Checkbox } from '@/components/ui/checkbox';
import { formatSalaryCompact } from '@/lib/utils';
import { getAuthToken } from '@/lib/api-client';

// Types
interface JobFormData {
  title: string;
  department: string;
  location: string;
  location_type: 'on-site' | 'remote' | 'hybrid';
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote_option?: string;
  description: string;
  responsibilities: string;
  required_skills: string[];
  nice_to_have_skills: string[];
  years_experience: number | null;
  education_level: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  benefits: string[];
  company_name: string;
}

export default function NewJobPage() {
  // Note: Page title set via metadata in layout.tsx for WCAG 2.1 AA compliance (Issue #148)
  // Client-side fallback to ensure title is always set (resolves SSR/hydration timing issues)
  useEffect(() => {
    document.title = 'Post New Job | HireFlux';
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isDuplicate = searchParams.get('duplicate') === 'true';

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Form data
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    department: '',
    location: '',
    location_type: 'on-site',
    employment_type: 'full-time',
    description: '',
    responsibilities: '',
    required_skills: [],
    nice_to_have_skills: [],
    years_experience: null,
    education_level: '',
    salary_currency: 'USD',
    benefits: [],
    company_name: '',
  });

  // AI Generation
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // New input states
  const [newSkill, setNewSkill] = useState('');
  const [newNiceToHaveSkill, setNewNiceToHaveSkill] = useState('');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Loading & Error states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftSaveIndicator, setDraftSaveIndicator] = useState(false);

  // Departments and predefined options
  const departments = ['Engineering', 'Sales', 'Marketing', 'Product', 'Operations', 'Design', 'HR', 'Finance', 'Other'];
  const educationLevels = ["High School", "Associate's Degree", "Bachelor's Degree", "Master's Degree", "PhD", "Not Required"];
  const benefitsOptions = [
    'Health Insurance',
    '401(k) Matching',
    'Remote Work',
    'Unlimited PTO',
    'Dental Insurance',
    'Vision Insurance',
    'Life Insurance',
    'Gym Membership',
    'Professional Development',
    'Stock Options',
  ];

  // Common skills for autocomplete
  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'Go', 'Rust',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis',
    'Machine Learning', 'Data Science', 'AI', 'DevOps', 'CI/CD', 'Agile', 'Scrum',
    'REST APIs', 'GraphQL', 'Microservices', 'System Design', 'Leadership', 'Communication'
  ];

  // Load duplicate template if present
  useEffect(() => {
    if (isDuplicate) {
      const template = localStorage.getItem('job_template');
      if (template) {
        try {
          const jobTemplate = JSON.parse(template);
          setFormData({
            ...formData,
            ...jobTemplate,
            title: jobTemplate.title, // Already has "Copy of" prefix from jobs list
          });
          localStorage.removeItem('job_template');
        } catch (err) {
          console.error('Failed to load job template:', err);
        }
      }
    }
  }, [isDuplicate]);

  // Update form field
  const updateField = (field: keyof JobFormData, value: JobFormData[keyof JobFormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Add skill
  const addSkill = (skill: string, isRequired: boolean = true) => {
    if (!skill.trim()) return;

    const field = isRequired ? 'required_skills' : 'nice_to_have_skills';
    if (formData[field].includes(skill.trim())) {
      return; // Already exists
    }

    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], skill.trim()],
    }));

    if (isRequired) {
      setNewSkill('');
    } else {
      setNewNiceToHaveSkill('');
    }
  };

  // Remove skill
  const removeSkill = (index: number, isRequired: boolean = true) => {
    const field = isRequired ? 'required_skills' : 'nice_to_have_skills';
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // Toggle benefit
  const toggleBenefit = (benefit: string) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.includes(benefit)
        ? prev.benefits.filter((b) => b !== benefit)
        : [...prev.benefits, benefit],
    }));
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Basics
        if (!formData.title.trim()) errors.title = 'Job title is required';
        if (!formData.department) errors.department = 'Department is required';
        if (!formData.location.trim()) errors.location = 'Location is required';
        if (!formData.employment_type) errors.employment_type = 'Employment type is required';
        break;

      case 2: // Description
        if (!formData.description.trim()) errors.description = 'Job description is required';
        if (!formData.responsibilities.trim()) errors.responsibilities = 'Responsibilities are required';
        break;

      case 3: // Requirements
        if (formData.required_skills.length === 0) errors.required_skills = 'At least one required skill is needed';
        if (formData.years_experience === null || formData.years_experience < 0) errors.years_experience = 'Years of experience is required';
        if (!formData.education_level) errors.education_level = 'Education level is required';
        break;

      case 4: // Compensation
        if (formData.salary_min && formData.salary_max && formData.salary_min > formData.salary_max) {
          errors.salary_max = 'Maximum salary must be greater than minimum';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigate to next step
  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(totalSteps, currentStep + 1));
      saveDraftSilently();
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  // AI Generation
  const generateWithAI = async () => {
    setAiLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/employer/login');
        return;
      }

      const data = await generateJobDescription({
        title: formData.title,
        key_points: [formData.department, formData.location],
        experience_level: 'mid' as ExperienceLevel, // Could be dynamic
        location: formData.location,
        employment_type: formData.employment_type as EmploymentType,
      });

      // Update form with AI-generated content
      setFormData((prev) => ({
        ...prev,
        description: data.description,
        responsibilities: data.responsibilities.join('\n'),
        required_skills: [...prev.required_skills, ...data.suggested_skills.filter(s => !prev.required_skills.includes(s))],
      }));

      setAiDialogOpen(false);
      toast.success('Description generated');
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate job description');
      toast.error('Failed to generate description. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Save draft silently (for auto-save)
  const saveDraftSilently = () => {
    if (!formData.title) return; // Don't save empty forms

    setDraftSaveIndicator(true);
    setLastSaved(new Date());
    setTimeout(() => setDraftSaveIndicator(false), 2000);

    // Could save to localStorage or backend here
    localStorage.setItem('job_draft', JSON.stringify(formData));
  };

  // Save as draft (explicit action)
  const saveDraft = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/employer/login');
        return;
      }

      const jobData: Partial<JobCreateRequest> = {
        title: formData.title,
        company_name: formData.company_name,
        department: formData.department,
        location: formData.location,
        location_type: formData.location_type as LocationType,
        employment_type: formData.employment_type as EmploymentType,
        salary_min: formData.salary_min,
        salary_max: formData.salary_max,
        description: formData.description,
        required_skills: formData.required_skills,
        preferred_skills: formData.nice_to_have_skills,
      };

      await createJob(jobData as JobCreateRequest);

      toast.success('Job saved as draft');
      localStorage.removeItem('job_draft');
      router.push('/employer/jobs');
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save job');
      toast.error('Failed to create job. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Publish job
  const publishJob = async () => {
    // Validate all steps
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        setError(`Please complete all required fields in step ${step}`);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/employer/login');
        return;
      }

      const jobData: Partial<JobCreateRequest> = {
        title: formData.title,
        company_name: formData.company_name,
        department: formData.department,
        location: formData.location,
        location_type: formData.location_type as LocationType,
        employment_type: formData.employment_type as EmploymentType,
        salary_min: formData.salary_min,
        salary_max: formData.salary_max,
        description: formData.description,
        required_skills: formData.required_skills,
        preferred_skills: formData.nice_to_have_skills,
      };

      await createJob(jobData as JobCreateRequest);

      toast.success('Job posted successfully');
      localStorage.removeItem('job_draft');
      router.push('/employer/jobs');
    } catch (err) {
      console.error('Publish error:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish job');
      toast.error('Failed to create job. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!formData.title) return;

    const timer = setTimeout(() => {
      saveDraftSilently();
    }, 30000);

    return () => clearTimeout(timer);
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    if (!isDuplicate) {
      const draft = localStorage.getItem('job_draft');
      if (draft) {
        try {
          setFormData(JSON.parse(draft));
        } catch (err) {
          console.error('Failed to load draft:', err);
        }
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" data-job-wizard>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Job</h1>
              <p className="text-sm text-gray-600 mt-1" data-current-step>
                Step {currentStep} of {totalSteps}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {draftSaveIndicator && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Draft saved
                </span>
              )}
              {lastSaved && !draftSaveIndicator && (
                <span className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" onClick={saveDraft} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 flex items-center gap-2" data-step-indicator>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i + 1 === currentStep
                    ? 'bg-blue-600'
                    : i + 1 < currentStep
                    ? 'bg-green-600'
                    : 'bg-gray-200'
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

        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Basics</CardTitle>
              <CardDescription>
                Basic information about the job position
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
                  data-job-title-input
                />
                {validationErrors.title && (
                  <p className="text-sm text-red-600">{validationErrors.title}</p>
                )}
              </div>

              {/* Department & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => updateField('department', value)}
                  >
                    <SelectTrigger data-department-input>
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
                  {validationErrors.department && (
                    <p className="text-sm text-red-600">{validationErrors.department}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    data-location-input
                  />
                  {validationErrors.location && (
                    <p className="text-sm text-red-600">{validationErrors.location}</p>
                  )}
                </div>
              </div>

              {/* Employment Type */}
              <div className="space-y-2">
                <Label htmlFor="employment_type">Employment Type *</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value: string) => updateField('employment_type', value)}
                >
                  <SelectTrigger data-employment-type-select>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time" data-employment-option="Full-time">
                      Full-time
                    </SelectItem>
                    <SelectItem value="part-time" data-employment-option="Part-time">
                      Part-time
                    </SelectItem>
                    <SelectItem value="contract" data-employment-option="Contract">
                      Contract
                    </SelectItem>
                    <SelectItem value="internship" data-employment-option="Internship">
                      Internship
                    </SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.employment_type && (
                  <p className="text-sm text-red-600">{validationErrors.employment_type}</p>
                )}
              </div>

              {/* Remote Options */}
              <div className="space-y-2">
                <Label>Remote Options</Label>
                <div className="grid grid-cols-3 gap-3">
                  {['On-site', 'Remote', 'Hybrid'].map((option) => (
                    <div
                      key={option}
                      onClick={() => updateField('location_type', option.toLowerCase())}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateField('location_type', option.toLowerCase()); } }}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        formData.location_type === option.toLowerCase()
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-center">{option}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Description */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Step 2: Description</CardTitle>
                  <CardDescription>
                    Job description and key responsibilities
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setAiDialogOpen(true)}
                  className="gap-2"
                  disabled={!formData.title}
                  data-ai-generate-button
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
                  rows={8}
                  className="resize-none"
                  data-description-textarea
                />
                {validationErrors.description && (
                  <p className="text-sm text-red-600">{validationErrors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsibilities">Responsibilities *</Label>
                <Textarea
                  id="responsibilities"
                  value={formData.responsibilities}
                  onChange={(e) => updateField('responsibilities', e.target.value)}
                  placeholder="Build scalable systems&#10;Mentor junior engineers&#10;Lead technical design discussions..."
                  rows={6}
                  className="resize-none"
                  data-responsibilities-textarea
                />
                {validationErrors.responsibilities && (
                  <p className="text-sm text-red-600">{validationErrors.responsibilities}</p>
                )}
              </div>

              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600" data-ai-loading>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating with AI...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Requirements */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Requirements</CardTitle>
              <CardDescription>
                Skills, experience, and education requirements
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
                    placeholder="e.g., React, TypeScript, Node.js"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill(newSkill, true);
                      }
                    }}
                    list="common-skills"
                    data-required-skills-input
                  />
                  <datalist id="common-skills">
                    {commonSkills.map((skill) => (
                      <option key={skill} value={skill} />
                    ))}
                  </datalist>
                  <Button
                    type="button"
                    onClick={() => addSkill(newSkill, true)}
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
                        onClick={() => removeSkill(index, true)}
                      />
                    </Badge>
                  ))}
                </div>
                {validationErrors.required_skills && (
                  <p className="text-sm text-red-600">{validationErrors.required_skills}</p>
                )}
              </div>

              {/* Nice-to-Have Skills */}
              <div className="space-y-2">
                <Label>Nice-to-Have Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={newNiceToHaveSkill}
                    onChange={(e) => setNewNiceToHaveSkill(e.target.value)}
                    placeholder="e.g., GraphQL, Docker, AWS"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill(newNiceToHaveSkill, false);
                      }
                    }}
                    list="common-skills"
                    data-nice-to-have-skills-input
                  />
                  <Button
                    type="button"
                    onClick={() => addSkill(newNiceToHaveSkill, false)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.nice_to_have_skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="gap-2">
                      {skill}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeSkill(index, false)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Years of Experience */}
              <div className="space-y-2">
                <Label htmlFor="years_experience">Years of Experience *</Label>
                <Input
                  id="years_experience"
                  type="number"
                  value={formData.years_experience ?? ''}
                  onChange={(e) => updateField('years_experience', parseInt(e.target.value) || null)}
                  placeholder="e.g., 5"
                  min="0"
                  data-years-experience-input
                />
                {validationErrors.years_experience && (
                  <p className="text-sm text-red-600">{validationErrors.years_experience}</p>
                )}
              </div>

              {/* Education Level */}
              <div className="space-y-2">
                <Label htmlFor="education_level">Education Level *</Label>
                <Select
                  value={formData.education_level}
                  onValueChange={(value) => updateField('education_level', value)}
                >
                  <SelectTrigger data-education-level-select>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    {educationLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.education_level && (
                  <p className="text-sm text-red-600">{validationErrors.education_level}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Compensation */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Compensation</CardTitle>
              <CardDescription>
                Salary range and benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Salary Range */}
              <div className="space-y-2">
                <Label>Salary Range *</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="salary_min" className="text-xs text-gray-600">Minimum</Label>
                    <Input
                      id="salary_min"
                      type="number"
                      value={formData.salary_min || ''}
                      onChange={(e) => updateField('salary_min', parseInt(e.target.value) || undefined)}
                      placeholder="100000"
                      data-salary-min-input
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary_max" className="text-xs text-gray-600">Maximum</Label>
                    <Input
                      id="salary_max"
                      type="number"
                      value={formData.salary_max || ''}
                      onChange={(e) => updateField('salary_max', parseInt(e.target.value) || undefined)}
                      placeholder="150000"
                      data-salary-max-input
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary_currency" className="text-xs text-gray-600">Currency</Label>
                    <Select
                      value={formData.salary_currency}
                      onValueChange={(value) => updateField('salary_currency', value)}
                    >
                      <SelectTrigger data-salary-currency-select>
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
                {validationErrors.salary_max && (
                  <p className="text-sm text-red-600">{validationErrors.salary_max}</p>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <Label>Benefits</Label>
                <div className="grid grid-cols-2 gap-3">
                  {benefitsOptions.map((benefit) => (
                    <div key={benefit} className="flex items-center space-x-2">
                      <Checkbox
                        id={benefit}
                        checked={formData.benefits.includes(benefit)}
                        onChange={() => toggleBenefit(benefit)}
                        data-benefit-checkbox={benefit}
                      />
                      <label
                        htmlFor={benefit}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {benefit}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.benefits.map((benefit) => (
                    <Badge key={benefit} variant="outline">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 5: Review & Publish</CardTitle>
              <CardDescription>
                Review your job posting and publish
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6" data-job-preview>
              {/* Job Title */}
              <div>
                <h2 className="text-2xl font-bold mb-2">{formData.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{formData.department}</span>
                  <span>•</span>
                  <span>{formData.location}</span>
                  <span>•</span>
                  <span className="capitalize">{formData.location_type}</span>
                  <span>•</span>
                  <span className="capitalize">{formData.employment_type}</span>
                </div>
                {(formData.salary_min || formData.salary_max) && (
                  <p className="text-green-600 font-medium mt-2">
                    {formatSalaryCompact(formData.salary_min, formData.salary_max)}
                  </p>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {formData.description}
                </p>
              </div>

              {/* Responsibilities */}
              {formData.responsibilities && (
                <div>
                  <h3 className="font-semibold mb-2">Responsibilities</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {formData.responsibilities}
                  </p>
                </div>
              )}

              {/* Required Skills */}
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

              {/* Nice-to-Have Skills */}
              {formData.nice_to_have_skills.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Nice-to-Have Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.nice_to_have_skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience & Education */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Experience</h3>
                  <p className="text-sm text-gray-700">{formData.years_experience} years</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Education</h3>
                  <p className="text-sm text-gray-700">{formData.education_level}</p>
                </div>
              </div>

              {/* Benefits */}
              {formData.benefits.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Benefits</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.benefits.map((benefit, index) => (
                      <Badge key={index} variant="outline">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            data-back-button
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={goToNextStep} data-next-button>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={isSaving}
                data-save-draft-button
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button
                onClick={publishJob}
                disabled={isSaving}
                data-publish-button
              >
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
              AI will create a comprehensive job description based on your job title and details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Based on your job title "{formData.title}" and department "{formData.department}",
              AI will generate a professional job description and responsibilities.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiLoading}>
              Cancel
            </Button>
            <Button onClick={generateWithAI} disabled={aiLoading}>
              {aiLoading ? (
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
    </div>
  );
}
