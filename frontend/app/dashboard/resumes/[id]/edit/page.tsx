'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useResumeStore, type ParsedResumeData } from '@/lib/stores/resume-store';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PageLoader } from '@/components/ui/page-loader';

// Form validation schema
const resumeSchema = z.object({
  contact_info: z.object({
    full_name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').min(1, 'Email is required'),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
    website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  }),
  summary: z.string().optional(),
  work_experience: z.array(
    z.object({
      company: z.string().min(1, 'Company is required'),
      title: z.string().min(1, 'Title is required'),
      location: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      description: z.string().optional(),
      responsibilities: z.array(z.string()).default([]),
      is_current: z.boolean().default(false),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string().min(1, 'Institution is required'),
      degree: z.string().optional(),
      field_of_study: z.string().optional(),
      location: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      gpa: z.string().optional(),
      honors: z.array(z.string()).default([]),
    })
  ),
  skills: z.array(z.string()),
  certifications: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      issuing_organization: z.string().min(1, 'Organization is required'),
      issue_date: z.string().optional(),
      expiry_date: z.string().optional(),
      credential_id: z.string().optional(),
      credential_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
    })
  ),
  languages: z.array(z.string()),
  awards: z.array(z.string()),
  publications: z.array(z.string()),
  projects: z.array(z.any()),
});

type ResumeFormData = z.infer<typeof resumeSchema>;

export default function ResumeEditPage() {
  const router = useRouter();
  const params = useParams();
  const resumeId = params?.id as string;

  const {
    currentResume,
    isLoading,
    error,
    fetchResume,
    updateParsedData,
    clearCurrentResume,
  } = useResumeStore();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ResumeFormData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contact_info: {
        full_name: '',
        email: '',
        phone: '',
        location: '',
        linkedin_url: '',
        website: '',
      },
      summary: '',
      work_experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      awards: [],
      publications: [],
      projects: [],
    },
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: 'work_experience',
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: 'education',
  });

  const {
    fields: certificationFields,
    append: appendCertification,
    remove: removeCertification,
  } = useFieldArray({
    control,
    name: 'certifications',
  });

  const skills = watch('skills');
  const languages = watch('languages');

  useEffect(() => {
    if (resumeId) {
      fetchResume(resumeId);
    }

    return () => {
      clearCurrentResume();
    };
  }, [resumeId, fetchResume, clearCurrentResume]);

  useEffect(() => {
    if (currentResume?.parsed_data) {
      const data = currentResume.parsed_data;
      reset({
        contact_info: data.contact_info || {},
        summary: data.summary || '',
        work_experience: data.work_experience || [],
        education: data.education || [],
        skills: data.skills || [],
        certifications: data.certifications || [],
        languages: data.languages || [],
        awards: data.awards || [],
        publications: data.publications || [],
        projects: data.projects || [],
      });
    }
  }, [currentResume, reset]);

  const onSubmit = async (data: ResumeFormData) => {
    try {
      setSaving(true);
      await updateParsedData(resumeId, data as ParsedResumeData);
      setSaveSuccess(true);
      toast.success('Resume updated successfully');

      setTimeout(() => {
        router.push(`/dashboard/resumes/${resumeId}`);
      }, 1000);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to update resume. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      setValue('skills', [...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setValue(
      'skills',
      skills.filter((_, i) => i !== index)
    );
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim()) {
      setValue('languages', [...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (index: number) => {
    setValue(
      'languages',
      languages.filter((_, i) => i !== index)
    );
  };

  const handleCancel = () => {
    router.push(`/dashboard/resumes/${resumeId}`);
  };

  if (isLoading) {
    return <PageLoader message="Loading resume..." fullScreen />;
  }

  if (!currentResume) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Resume not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleCancel} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resume
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit Resume</h1>
            <p className="mt-2 text-muted-foreground">{currentResume.file_name}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={saving || saveSuccess}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-800">Changes Saved!</h3>
              <p className="text-sm text-green-700">Redirecting to resume view...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      <ErrorBanner error={error} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="contact" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
          </TabsList>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Your basic contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      {...register('contact_info.full_name')}
                      placeholder="John Doe"
                    />
                    {errors.contact_info?.full_name && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.contact_info.full_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('contact_info.email')}
                      placeholder="john@example.com"
                    />
                    {errors.contact_info?.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.contact_info.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...register('contact_info.phone')}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      {...register('contact_info.location')}
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div>
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      {...register('contact_info.linkedin_url')}
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                    {errors.contact_info?.linkedin_url && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.contact_info.linkedin_url.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      {...register('contact_info.website')}
                      placeholder="https://johndoe.com"
                    />
                    {errors.contact_info?.website && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.contact_info.website.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea
                    id="summary"
                    {...register('summary')}
                    placeholder="Brief overview of your professional background and goals..."
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experience Tab */}
          <TabsContent value="experience" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Work Experience</CardTitle>
                    <CardDescription>Your professional work history</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendExperience({
                        company: '',
                        title: '',
                        location: '',
                        start_date: '',
                        end_date: '',
                        description: '',
                        responsibilities: [],
                        is_current: false,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Experience
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {experienceFields.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No work experience added yet. Click "Add Experience" to get started.
                  </p>
                ) : (
                  experienceFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Experience #{index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExperience(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Job Title *</Label>
                          <Input
                            {...register(`work_experience.${index}.title`)}
                            placeholder="Software Engineer"
                          />
                          {errors.work_experience?.[index]?.title && (
                            <p className="text-sm text-red-600 mt-1">
                              {errors.work_experience[index].title.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Company *</Label>
                          <Input
                            {...register(`work_experience.${index}.company`)}
                            placeholder="Acme Corp"
                          />
                          {errors.work_experience?.[index]?.company && (
                            <p className="text-sm text-red-600 mt-1">
                              {errors.work_experience[index].company.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Location</Label>
                          <Input
                            {...register(`work_experience.${index}.location`)}
                            placeholder="San Francisco, CA"
                          />
                        </div>

                        <div>
                          <Label>Start Date</Label>
                          <Input
                            {...register(`work_experience.${index}.start_date`)}
                            placeholder="Jan 2020"
                          />
                        </div>

                        <div>
                          <Label>End Date</Label>
                          <Input
                            {...register(`work_experience.${index}.end_date`)}
                            placeholder="Present"
                            disabled={watch(`work_experience.${index}.is_current`)}
                          />
                        </div>

                        <div className="flex items-center space-x-2 mt-6">
                          <Checkbox
                            id={`current-${index}`}
                            checked={watch(`work_experience.${index}.is_current`)}
                            onChange={(e) =>
                              setValue(
                                `work_experience.${index}.is_current`,
                                e.target.checked
                              )
                            }
                          />
                          <Label htmlFor={`current-${index}`}>I currently work here</Label>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          {...register(`work_experience.${index}.description`)}
                          placeholder="Brief description of your role and achievements..."
                          rows={4}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Education</CardTitle>
                    <CardDescription>Your academic background</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendEducation({
                        institution: '',
                        degree: '',
                        field_of_study: '',
                        location: '',
                        start_date: '',
                        end_date: '',
                        gpa: '',
                        honors: [],
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {educationFields.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No education added yet. Click "Add Education" to get started.
                  </p>
                ) : (
                  educationFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Education #{index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEducation(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Institution *</Label>
                          <Input
                            {...register(`education.${index}.institution`)}
                            placeholder="Stanford University"
                          />
                          {errors.education?.[index]?.institution && (
                            <p className="text-sm text-red-600 mt-1">
                              {errors.education[index].institution.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Degree</Label>
                          <Input
                            {...register(`education.${index}.degree`)}
                            placeholder="Bachelor of Science"
                          />
                        </div>

                        <div>
                          <Label>Field of Study</Label>
                          <Input
                            {...register(`education.${index}.field_of_study`)}
                            placeholder="Computer Science"
                          />
                        </div>

                        <div>
                          <Label>Location</Label>
                          <Input
                            {...register(`education.${index}.location`)}
                            placeholder="Stanford, CA"
                          />
                        </div>

                        <div>
                          <Label>Start Date</Label>
                          <Input
                            {...register(`education.${index}.start_date`)}
                            placeholder="2016"
                          />
                        </div>

                        <div>
                          <Label>End Date</Label>
                          <Input
                            {...register(`education.${index}.end_date`)}
                            placeholder="2020"
                          />
                        </div>

                        <div>
                          <Label>GPA</Label>
                          <Input
                            {...register(`education.${index}.gpa`)}
                            placeholder="3.8/4.0"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Your technical and professional skills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="e.g., JavaScript, Python, Project Management..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(index)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {skills.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No skills added yet. Type a skill and press Enter or click the + button.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
                <CardDescription>Languages you can speak</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="e.g., English, Spanish, Mandarin..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLanguage();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddLanguage}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {lang}
                        <button
                          type="button"
                          onClick={() => handleRemoveLanguage(index)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {languages.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No languages added yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* More Tab (Certifications) */}
          <TabsContent value="more" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Certifications</CardTitle>
                    <CardDescription>Professional certifications and licenses</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendCertification({
                        name: '',
                        issuing_organization: '',
                        issue_date: '',
                        expiry_date: '',
                        credential_id: '',
                        credential_url: '',
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Certification
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {certificationFields.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No certifications added yet.
                  </p>
                ) : (
                  certificationFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Certification #{index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertification(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Certification Name *</Label>
                          <Input
                            {...register(`certifications.${index}.name`)}
                            placeholder="AWS Certified Solutions Architect"
                          />
                          {errors.certifications?.[index]?.name && (
                            <p className="text-sm text-red-600 mt-1">
                              {errors.certifications[index].name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Issuing Organization *</Label>
                          <Input
                            {...register(`certifications.${index}.issuing_organization`)}
                            placeholder="Amazon Web Services"
                          />
                          {errors.certifications?.[index]?.issuing_organization && (
                            <p className="text-sm text-red-600 mt-1">
                              {errors.certifications[index].issuing_organization.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Issue Date</Label>
                          <Input
                            {...register(`certifications.${index}.issue_date`)}
                            placeholder="Jan 2023"
                          />
                        </div>

                        <div>
                          <Label>Expiry Date</Label>
                          <Input
                            {...register(`certifications.${index}.expiry_date`)}
                            placeholder="Jan 2026"
                          />
                        </div>

                        <div>
                          <Label>Credential ID</Label>
                          <Input
                            {...register(`certifications.${index}.credential_id`)}
                            placeholder="ABC123DEF456"
                          />
                        </div>

                        <div>
                          <Label>Credential URL</Label>
                          <Input
                            {...register(`certifications.${index}.credential_url`)}
                            placeholder="https://..."
                          />
                          {errors.certifications?.[index]?.credential_url && (
                            <p className="text-sm text-red-600 mt-1">
                              {errors.certifications[index].credential_url.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky Save Button */}
        <div className="sticky bottom-4 mt-6 flex justify-end gap-2 bg-white/80 backdrop-blur-sm p-4 rounded-lg border shadow-lg">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || saveSuccess}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
