'use client';

import { useState } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  Zap,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { useResumeStore, type ParsedResumeData } from '@/lib/stores/resume-store';
import { resumeApi } from '@/lib/api';
import { toast } from 'sonner';

interface WorkExperienceForm {
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string[];
}

interface EducationForm {
  institution: string;
  degree: string;
  field_of_study: string;
  location: string;
  start_date: string;
  end_date: string;
  gpa: string;
}

export default function ResumeBuilderPage() {
  const router = useRouter();
  const { resumes, fetchResumes } = useResumeStore();

  // Form state
  const [formData, setFormData] = useState({
    // Contact Info
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    website: '',
    // Professional Summary
    summary: '',
    // Skills
    skills: [] as string[],
    skillsInput: '',
    // Target Job
    target_title: '',
    target_company: '',
    job_description: '',
  });

  const [workExperiences, setWorkExperiences] = useState<WorkExperienceForm[]>([
    {
      company: '',
      title: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      responsibilities: [''],
    },
  ]);

  const [education, setEducation] = useState<EducationForm[]>([
    {
      institution: '',
      degree: '',
      field_of_study: '',
      location: '',
      start_date: '',
      end_date: '',
      gpa: '',
    },
  ]);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<ParsedResumeData | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSkillsInputChange = (value: string) => {
    const skillsList = value.split(',').map((s) => s.trim()).filter((s) => s);
    setFormData((prev) => ({ ...prev, skillsInput: value, skills: skillsList }));
  };

  const handleAddWorkExperience = () => {
    setWorkExperiences((prev) => [
      ...prev,
      {
        company: '',
        title: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        responsibilities: [''],
      },
    ]);
  };

  const handleRemoveWorkExperience = (index: number) => {
    setWorkExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleWorkExperienceChange = (
    index: number,
    field: keyof WorkExperienceForm,
    value: string | boolean
  ) => {
    setWorkExperiences((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  const handleAddResponsibility = (expIndex: number) => {
    setWorkExperiences((prev) =>
      prev.map((exp, i) =>
        i === expIndex
          ? { ...exp, responsibilities: [...exp.responsibilities, ''] }
          : exp
      )
    );
  };

  const handleResponsibilityChange = (
    expIndex: number,
    respIndex: number,
    value: string
  ) => {
    setWorkExperiences((prev) =>
      prev.map((exp, i) =>
        i === expIndex
          ? {
              ...exp,
              responsibilities: exp.responsibilities.map((r, j) =>
                j === respIndex ? value : r
              ),
            }
          : exp
      )
    );
  };

  const handleRemoveResponsibility = (expIndex: number, respIndex: number) => {
    setWorkExperiences((prev) =>
      prev.map((exp, i) =>
        i === expIndex
          ? {
              ...exp,
              responsibilities: exp.responsibilities.filter((_, j) => j !== respIndex),
            }
          : exp
      )
    );
  };

  const handleAddEducation = () => {
    setEducation((prev) => [
      ...prev,
      {
        institution: '',
        degree: '',
        field_of_study: '',
        location: '',
        start_date: '',
        end_date: '',
        gpa: '',
      },
    ]);
  };

  const handleRemoveEducation = (index: number) => {
    setEducation((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEducationChange = (
    index: number,
    field: keyof EducationForm,
    value: string
  ) => {
    setEducation((prev) =>
      prev.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu))
    );
  };

  const validateForm = (): boolean => {
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (workExperiences.length === 0 || !workExperiences[0].company.trim()) {
      setError('At least one work experience is required');
      return false;
    }
    if (education.length === 0 || !education[0].institution.trim()) {
      setError('At least one education entry is required');
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);

    try {
      // Build parsed data structure
      const parsedData: ParsedResumeData = {
        contact_info: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          linkedin_url: formData.linkedin_url,
          website: formData.website,
        },
        summary: formData.summary,
        work_experience: workExperiences.map((exp) => ({
          company: exp.company,
          title: exp.title,
          location: exp.location,
          start_date: exp.start_date,
          end_date: exp.end_date,
          is_current: exp.is_current,
          description: '',
          responsibilities: exp.responsibilities.filter((r) => r.trim()),
        })),
        education: education.map((edu) => ({
          institution: edu.institution,
          degree: edu.degree,
          field_of_study: edu.field_of_study,
          location: edu.location,
          start_date: edu.start_date,
          end_date: edu.end_date,
          gpa: edu.gpa,
          honors: [],
        })),
        skills: formData.skills,
        certifications: [],
        languages: [],
        projects: [],
        awards: [],
        publications: [],
      };

      setGeneratedContent(parsedData);
      toast.success('Resume generated successfully');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate resume');
      toast.error('Failed to generate resume. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !resumeTitle.trim()) {
      setError('Please provide a resume title');
      return;
    }

    setIsSaving(true);

    try {
      // Create a new resume with the generated content
      const response = await resumeApi.createResume({
        title: resumeTitle,
        target_role: formData.target_title || 'General',
        content: generatedContent,
      });

      // Refresh resumes list
      await fetchResumes();

      toast.success('Resume saved successfully');

      // Redirect to resume detail page
      const resumeId = response.data.data.id;
      router.push(`/dashboard/resumes/${resumeId}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save resume');
      toast.error('Failed to save resume. Please try again.');
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF generation
    setError('PDF download feature coming soon');
  };

  const handleBack = () => {
    router.push('/dashboard/resumes');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resumes
        </Button>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6" />
          <h1 className="text-3xl font-bold">AI Resume Builder</h1>
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Build your professional resume from scratch with AI assistance
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Your basic contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  placeholder="linkedin.com/in/johndoe"
                  value={formData.linkedin_url}
                  onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="johndoe.com"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
              <CardDescription>Brief overview of your experience</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="summary"
                placeholder="e.g., Experienced Software Engineer with 5+ years..."
                rows={4}
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Comma-separated list</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="skills"
                placeholder="Python, React, AWS, Docker..."
                rows={3}
                value={formData.skillsInput}
                onChange={(e) => handleSkillsInputChange(e.target.value)}
              />
              {formData.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Work Experience *</CardTitle>
                  <CardDescription>Your employment history</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddWorkExperience}
                  disabled={isGenerating}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {workExperiences.map((exp, expIndex) => (
                <div key={expIndex} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold">
                      Position {expIndex + 1}
                    </Label>
                    {workExperiences.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWorkExperience(expIndex)}
                        disabled={isGenerating}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      placeholder="Company *"
                      value={exp.company}
                      onChange={(e) =>
                        handleWorkExperienceChange(expIndex, 'company', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Job Title *"
                      value={exp.title}
                      onChange={(e) =>
                        handleWorkExperienceChange(expIndex, 'title', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Location"
                      value={exp.location}
                      onChange={(e) =>
                        handleWorkExperienceChange(expIndex, 'location', e.target.value)
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="month"
                        placeholder="Start Date"
                        value={exp.start_date}
                        onChange={(e) =>
                          handleWorkExperienceChange(expIndex, 'start_date', e.target.value)
                        }
                      />
                      <Input
                        type="month"
                        placeholder="End Date"
                        value={exp.end_date}
                        disabled={exp.is_current}
                        onChange={(e) =>
                          handleWorkExperienceChange(expIndex, 'end_date', e.target.value)
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`current-${expIndex}`}
                        checked={exp.is_current}
                        onChange={(e) =>
                          handleWorkExperienceChange(
                            expIndex,
                            'is_current',
                            e.target.checked
                          )
                        }
                        className="rounded"
                      />
                      <Label htmlFor={`current-${expIndex}`} className="text-sm">
                        Currently working here
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Key Responsibilities</Label>
                      {exp.responsibilities.map((resp, respIndex) => (
                        <div key={respIndex} className="flex gap-2">
                          <Input
                            placeholder="e.g., Led development of..."
                            value={resp}
                            onChange={(e) =>
                              handleResponsibilityChange(
                                expIndex,
                                respIndex,
                                e.target.value
                              )
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveResponsibility(expIndex, respIndex)
                            }
                            disabled={exp.responsibilities.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddResponsibility(expIndex)}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Responsibility
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Education *</CardTitle>
                  <CardDescription>Your academic background</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddEducation}
                  disabled={isGenerating}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {education.map((edu, eduIndex) => (
                <div key={eduIndex} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold">
                      Degree {eduIndex + 1}
                    </Label>
                    {education.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEducation(eduIndex)}
                        disabled={isGenerating}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      placeholder="Institution *"
                      value={edu.institution}
                      onChange={(e) =>
                        handleEducationChange(eduIndex, 'institution', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Degree"
                      value={edu.degree}
                      onChange={(e) =>
                        handleEducationChange(eduIndex, 'degree', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Field of Study"
                      value={edu.field_of_study}
                      onChange={(e) =>
                        handleEducationChange(eduIndex, 'field_of_study', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Location"
                      value={edu.location}
                      onChange={(e) =>
                        handleEducationChange(eduIndex, 'location', e.target.value)
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="month"
                        placeholder="Start Date"
                        value={edu.start_date}
                        onChange={(e) =>
                          handleEducationChange(eduIndex, 'start_date', e.target.value)
                        }
                      />
                      <Input
                        type="month"
                        placeholder="End Date"
                        value={edu.end_date}
                        onChange={(e) =>
                          handleEducationChange(eduIndex, 'end_date', e.target.value)
                        }
                      />
                    </div>
                    <Input
                      placeholder="GPA (optional)"
                      value={edu.gpa}
                      onChange={(e) =>
                        handleEducationChange(eduIndex, 'gpa', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Resume
              </>
            )}
          </Button>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resume Preview</CardTitle>
                  <CardDescription>
                    {generatedContent
                      ? 'Your generated resume'
                      : 'Fill the form and click Generate to preview'}
                  </CardDescription>
                </div>
                {generatedContent && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      disabled={isSaving}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Resume
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generatedContent ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    No preview available
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete the form and click Generate to see your resume
                  </p>
                </div>
              ) : (
                <div className="bg-white border rounded-lg p-8 shadow-sm min-h-[800px]">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold">
                      {generatedContent.contact_info.full_name}
                    </h1>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <div>
                        {generatedContent.contact_info.location &&
                          `${generatedContent.contact_info.location} • `}
                        {generatedContent.contact_info.email}
                        {generatedContent.contact_info.phone &&
                          ` • ${generatedContent.contact_info.phone}`}
                      </div>
                      {generatedContent.contact_info.linkedin_url && (
                        <div>{generatedContent.contact_info.linkedin_url}</div>
                      )}
                      {generatedContent.contact_info.website && (
                        <div>{generatedContent.contact_info.website}</div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {generatedContent.summary && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold border-b-2 border-gray-300 pb-1 mb-3">
                        Professional Summary
                      </h2>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {generatedContent.summary}
                      </p>
                    </div>
                  )}

                  {/* Experience */}
                  {generatedContent.work_experience.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold border-b-2 border-gray-300 pb-1 mb-3">
                        Work Experience
                      </h2>
                      <div className="space-y-4">
                        {generatedContent.work_experience.map((exp, index) => (
                          <div key={index}>
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <h3 className="font-semibold">{exp.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {exp.company}
                                  {exp.location && ` • ${exp.location}`}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-nowrap">
                                {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                              </p>
                            </div>
                            {exp.responsibilities.length > 0 && (
                              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                                {exp.responsibilities.map((resp, idx) => (
                                  <li key={idx}>• {resp}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {generatedContent.education.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold border-b-2 border-gray-300 pb-1 mb-3">
                        Education
                      </h2>
                      <div className="space-y-3">
                        {generatedContent.education.map((edu, index) => (
                          <div key={index}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">
                                  {edu.degree}
                                  {edu.field_of_study && ` in ${edu.field_of_study}`}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {edu.institution}
                                  {edu.location && ` • ${edu.location}`}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-nowrap">
                                {edu.start_date && edu.end_date
                                  ? `${edu.start_date} - ${edu.end_date}`
                                  : edu.end_date || edu.start_date}
                              </p>
                            </div>
                            {edu.gpa && (
                              <p className="text-sm text-gray-700 mt-1">GPA: {edu.gpa}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {generatedContent.skills.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold border-b-2 border-gray-300 pb-1 mb-3">
                        Technical Skills
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {generatedContent.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Message */}
              {generatedContent && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Resume Generated!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your resume has been generated. You can now save it or export to PDF.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Give your resume a title to help you identify it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="resume-title">Resume Title</Label>
            <Input
              id="resume-title"
              placeholder="e.g., Software Engineer Resume"
              value={resumeTitle}
              onChange={(e) => setResumeTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={isSaving || !resumeTitle.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Resume'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
