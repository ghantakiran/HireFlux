'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useResumeStore, ParseStatus, type Resume } from '@/lib/stores/resume-store';
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  Star,
  FileText,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  Languages,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
} from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PageLoader } from '@/components/ui/page-loader';
import { formatDateLong } from '@/lib/utils';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const resumeId = params?.id as string;

  const {
    currentResume,
    defaultResumeId,
    isLoading,
    error,
    fetchResume,
    deleteResume,
    setDefaultResume,
    downloadResume,
    clearCurrentResume,
  } = useResumeStore();

  const deleteDialog = useConfirmDialog({
    onConfirm: async (id) => { await deleteResume(id); },
    onSuccess: () => router.push('/dashboard/resumes'),
  });

  useEffect(() => {
    if (resumeId) {
      fetchResume(resumeId);
    }

    return () => {
      clearCurrentResume();
    };
  }, [resumeId, fetchResume, clearCurrentResume]);

  const handleBack = () => {
    router.push('/dashboard/resumes');
  };

  const handleEdit = () => {
    router.push(`/dashboard/resumes/${resumeId}/edit`);
  };

  const handleDownload = async () => {
    try {
      await downloadResume(resumeId);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleSetDefault = async () => {
    try {
      await setDefaultResume(resumeId);
    } catch (err) {
      // Error handled by store
    }
  };

  const getStatusBadge = (status: ParseStatus) => {
    switch (status) {
      case ParseStatus.COMPLETED:
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Parsed Successfully
          </Badge>
        );
      case ParseStatus.PROCESSING:
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case ParseStatus.PENDING:
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case ParseStatus.FAILED:
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Parsing Failed
          </Badge>
        );
    }
  };

  if (isLoading || !currentResume) {
    return <PageLoader message="Loading resume..." fullScreen />;
  }

  const resume = currentResume;
  const parsedData = resume.parsed_data;
  const isDefault = resume.id === defaultResumeId;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resumes
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{resume.file_name}</h1>
              {isDefault && <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />}
            </div>
            <p className="text-muted-foreground">
              Uploaded on {formatDateLong(resume.created_at)}
            </p>
          </div>

          <div className="flex gap-2">
            {!isDefault && (
              <Button variant="outline" onClick={handleSetDefault}>
                <Star className="mr-2 h-4 w-4" />
                Set as Default
              </Button>
            )}
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => deleteDialog.open(resumeId)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <ErrorBanner error={error} />

      {/* Status Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              {getStatusBadge(resume.parse_status)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">File Type</p>
              <p className="font-medium">
                {resume.file_type.includes('pdf') ? 'PDF' : 'DOCX'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">File Size</p>
              <p className="font-medium">
                {(resume.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parse Error */}
      {resume.parse_status === ParseStatus.FAILED && resume.parse_error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Parsing Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{resume.parse_error}</p>
            <p className="text-sm text-red-600 mt-2">
              You can still download the original file or try uploading again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Parsed Data Tabs */}
      {parsedData && resume.parse_status === ParseStatus.COMPLETED && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills & More</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Contact Info */}
            {parsedData.contact_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parsedData.contact_info.full_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{parsedData.contact_info.full_name}</p>
                    </div>
                  )}
                  {parsedData.contact_info.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${parsedData.contact_info.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {parsedData.contact_info.email}
                      </a>
                    </div>
                  )}
                  {parsedData.contact_info.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{parsedData.contact_info.phone}</p>
                    </div>
                  )}
                  {parsedData.contact_info.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p>{parsedData.contact_info.location}</p>
                    </div>
                  )}
                  {parsedData.contact_info.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={parsedData.contact_info.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {parsedData.contact_info.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={parsedData.contact_info.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {parsedData.contact_info.website}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            {parsedData.summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Professional Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-line">{parsedData.summary}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Experience Tab */}
          <TabsContent value="experience" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Work Experience
                </CardTitle>
                <CardDescription>
                  {parsedData.work_experience?.length || 0} position(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {parsedData.work_experience && parsedData.work_experience.length > 0 ? (
                  parsedData.work_experience.map((exp, index) => (
                    <div key={index}>
                      {index > 0 && <Separator className="my-4" />}
                      <div>
                        <h3 className="font-semibold text-lg">{exp.title}</h3>
                        <p className="text-muted-foreground">
                          {exp.company}
                          {exp.location && ` • ${exp.location}`}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                        </p>
                        {exp.description && (
                          <p className="mt-3 text-gray-700 whitespace-pre-line">
                            {exp.description}
                          </p>
                        )}
                        {exp.responsibilities && exp.responsibilities.length > 0 && (
                          <ul className="mt-3 space-y-1 list-disc list-inside text-gray-700">
                            {exp.responsibilities.map((resp, idx) => (
                              <li key={idx}>{resp}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No work experience found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </CardTitle>
                <CardDescription>
                  {parsedData.education?.length || 0} degree(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {parsedData.education && parsedData.education.length > 0 ? (
                  parsedData.education.map((edu, index) => (
                    <div key={index}>
                      {index > 0 && <Separator className="my-4" />}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {edu.degree}
                          {edu.field_of_study && ` in ${edu.field_of_study}`}
                        </h3>
                        <p className="text-muted-foreground">
                          {edu.institution}
                          {edu.location && ` • ${edu.location}`}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {edu.start_date && edu.end_date
                            ? `${edu.start_date} - ${edu.end_date}`
                            : edu.end_date || edu.start_date}
                        </p>
                        {edu.gpa && (
                          <p className="text-sm text-gray-700 mt-2">GPA: {edu.gpa}</p>
                        )}
                        {edu.honors && edu.honors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Honors & Awards:</p>
                            <ul className="list-disc list-inside text-sm text-gray-700">
                              {edu.honors.map((honor, idx) => (
                                <li key={idx}>{honor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No education information found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills & More Tab */}
          <TabsContent value="skills" className="space-y-4">
            {/* Skills */}
            {parsedData.skills && parsedData.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Skills
                  </CardTitle>
                  <CardDescription>{parsedData.skills.length} skill(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {parsedData.certifications && parsedData.certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Certifications
                  </CardTitle>
                  <CardDescription>
                    {parsedData.certifications.length} certification(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsedData.certifications.map((cert, index) => (
                    <div key={index}>
                      {index > 0 && <Separator className="my-4" />}
                      <div>
                        <h3 className="font-semibold">{cert.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cert.issuing_organization}
                        </p>
                        {cert.issue_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Issued: {cert.issue_date}
                            {cert.expiry_date && ` • Expires: ${cert.expiry_date}`}
                          </p>
                        )}
                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                          >
                            View Credential
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Languages */}
            {parsedData.languages && parsedData.languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.languages.map((lang, index) => (
                      <Badge key={index} variant="outline">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Awards */}
            {parsedData.awards && parsedData.awards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Awards & Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 list-disc list-inside text-gray-700">
                    {parsedData.awards.map((award, index) => (
                      <li key={index}>{award}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={() => deleteDialog.close()}
        title="Delete Resume"
        description={`Are you sure you want to delete "${resume.file_name}"? This action cannot be undone.`}
        isConfirming={deleteDialog.isConfirming}
        onConfirm={deleteDialog.confirm}
      />
    </div>
  );
}
