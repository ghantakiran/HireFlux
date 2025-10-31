'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FileText,
  Building,
  Briefcase,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  useCoverLetterStore,
  type CoverLetterTone,
  type CoverLetterLength,
} from '@/lib/stores/cover-letter-store';
import { useResumeStore } from '@/lib/stores/resume-store';
import { useJobStore } from '@/lib/stores/job-store';

export default function GenerateCoverLetterPage() {
  const router = useRouter();
  const {
    generateCoverLetter,
    isGenerating,
    generationProgress,
    error,
    clearError,
    resetGenerationProgress,
  } = useCoverLetterStore();

  const { resumes, fetchResumes } = useResumeStore();
  const { jobs, fetchJobs } = useJobStore();

  // Form state
  const [step, setStep] = useState(1);
  const [jobSource, setJobSource] = useState<'saved' | 'paste'>('saved');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [resumeVersionId, setResumeVersionId] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('formal');
  const [length, setLength] = useState<CoverLetterLength>('medium');
  const [personalizeCompany, setPersonalizeCompany] = useState(true);
  const [generatedContent, setGeneratedContent] = useState('');

  useEffect(() => {
    // Fetch resumes and jobs on mount
    fetchResumes();
    fetchJobs();
  }, []);

  useEffect(() => {
    // Auto-fill job details when a saved job is selected
    if (jobSource === 'saved' && selectedJobId) {
      const job = jobs.find((j) => j.id === selectedJobId);
      if (job) {
        setJobDescription(job.description);
        setJobTitle(job.title);
        setCompanyName(job.company);
      }
    }
  }, [jobSource, selectedJobId, jobs]);

  const handleGenerate = async () => {
    try {
      clearError();
      const coverLetter = await generateCoverLetter({
        job_id: jobSource === 'saved' ? selectedJobId : undefined,
        job_description: jobDescription,
        resume_version_id: resumeVersionId,
        tone,
        length,
        personalize_company: personalizeCompany,
        job_title: jobTitle,
        company_name: companyName,
      });

      setGeneratedContent(coverLetter.content);
      setStep(4);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleSaveAndView = () => {
    // Since generation already saved it, just navigate
    router.push('/dashboard/cover-letters');
  };

  const canProceedStep1 = () => {
    if (jobSource === 'saved') {
      return selectedJobId !== '';
    }
    return jobDescription.trim().length > 50;
  };

  const canProceedStep2 = () => {
    return resumeVersionId !== '';
  };

  const canGenerate = () => {
    return canProceedStep1() && canProceedStep2();
  };

  const totalSteps = 4;
  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/cover-letters')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cover Letters
        </Button>
        <h1 className="text-3xl font-bold mb-2">Generate Cover Letter</h1>
        <p className="text-muted-foreground">
          Let AI create a personalized cover letter for your target job
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">
            {step === 1 && 'Job Information'}
            {step === 2 && 'Select Resume'}
            {step === 3 && 'Customize Settings'}
            {step === 4 && 'Preview & Save'}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Job Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Job Information</h2>
                <p className="text-muted-foreground">
                  Select a saved job or paste the job description
                </p>
              </div>

              <Tabs value={jobSource} onValueChange={(v) => setJobSource(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="saved">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Saved Jobs
                  </TabsTrigger>
                  <TabsTrigger value="paste">
                    <FileText className="mr-2 h-4 w-4" />
                    Paste Job Description
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="saved" className="space-y-4 mt-4">
                  {jobs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No saved jobs yet.</p>
                      <Button
                        variant="link"
                        onClick={() => router.push('/dashboard/jobs')}
                        className="mt-2"
                      >
                        Browse and save jobs
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Select a Job</Label>
                      <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a saved job" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>
                              <div className="flex items-center gap-2">
                                <span>{job.title}</span>
                                <span className="text-muted-foreground">
                                  at {job.company}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="paste" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-title">Job Title</Label>
                    <Input
                      id="job-title"
                      placeholder="e.g., Senior Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      placeholder="e.g., TechCorp Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job-description">Job Description</Label>
                    <Textarea
                      id="job-description"
                      placeholder="Paste the full job description here..."
                      rows={12}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {jobDescription.trim().length} characters (minimum 50 required)
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1()}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Resume */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Select Resume</h2>
                <p className="text-muted-foreground">
                  Choose which resume version to base the cover letter on
                </p>
              </div>

              {resumes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No resumes yet.</p>
                  <Button
                    variant="link"
                    onClick={() => router.push('/dashboard/resumes')}
                    className="mt-2"
                  >
                    Create a resume first
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map((resume) => (
                    <Card
                      key={resume.id}
                      className={`cursor-pointer transition-all ${
                        resumeVersionId === resume.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => setResumeVersionId(resume.id)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{resume.file_name}</CardTitle>
                            <CardDescription>
                              Resume Version
                            </CardDescription>
                          </div>
                          {resumeVersionId === resume.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2()}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Customize Settings */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Customize Settings</h2>
                <p className="text-muted-foreground">
                  Adjust tone, length, and personalization options
                </p>
              </div>

              <div className="space-y-4">
                {/* Tone Selection */}
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['formal', 'concise', 'conversational'] as CoverLetterTone[]).map(
                      (t) => (
                        <Card
                          key={t}
                          className={`cursor-pointer transition-all ${
                            tone === t
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:border-gray-400'
                          }`}
                          onClick={() => setTone(t)}
                        >
                          <CardContent className="p-4 text-center">
                            <p className="font-medium capitalize">{t}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t === 'formal' && 'Professional and traditional'}
                              {t === 'concise' && 'Brief and to the point'}
                              {t === 'conversational' && 'Friendly and approachable'}
                            </p>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                </div>

                {/* Length Selection */}
                <div className="space-y-2">
                  <Label>Length</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['short', 'medium', 'long'] as CoverLetterLength[]).map((l) => (
                      <Card
                        key={l}
                        className={`cursor-pointer transition-all ${
                          length === l
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-gray-400'
                        }`}
                        onClick={() => setLength(l)}
                      >
                        <CardContent className="p-4 text-center">
                          <p className="font-medium capitalize">{l}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {l === 'short' && '~150 words'}
                            {l === 'medium' && '~250 words'}
                            {l === 'long' && '~350 words'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Company Personalization */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Company Personalization</Label>
                    <p className="text-sm text-muted-foreground">
                      Include specific details about the company (when available)
                    </p>
                  </div>
                  <Switch
                    checked={personalizeCompany}
                    onCheckedChange={setPersonalizeCompany}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleGenerate} disabled={!canGenerate() || isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating ({generationProgress}%)
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Cover Letter
                    </>
                  )}
                </Button>
              </div>

              {/* Generation Progress */}
              {isGenerating && generationProgress > 0 && (
                <div className="mt-4">
                  <Progress value={generationProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    AI is crafting your personalized cover letter...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Preview & Save */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Your Cover Letter is Ready!
                  </h2>
                  <p className="text-muted-foreground">
                    Review and save your AI-generated cover letter
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{generatedContent}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {tone}
                </Badge>
                <Badge variant="outline">{length}</Badge>
                {personalizeCompany && (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Personalized
                  </Badge>
                )}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(3);
                    resetGenerationProgress();
                  }}
                >
                  Regenerate with Different Settings
                </Button>
                <Button onClick={handleSaveAndView}>
                  View All Cover Letters
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
