'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Briefcase,
  ExternalLink,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  Target,
} from 'lucide-react';
import { useJobStore } from '@/lib/stores/job-store';

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;

  const {
    currentJob,
    isLoading,
    error,
    fetchJob,
    saveJob,
    unsaveJob,
    isSaved,
    clearCurrentJob,
    clearError,
  } = useJobStore();

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJob(jobId);
    }

    return () => {
      clearCurrentJob();
    };
  }, [jobId]);

  const handleBack = () => {
    router.push('/dashboard/jobs');
  };

  const handleSaveJob = async () => {
    try {
      setIsSaving(true);
      if (isSaved(jobId)) {
        await unsaveJob(jobId);
      } else {
        await saveJob(jobId);
      }
    } catch (err) {
      // Error handled by store
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = () => {
    router.push(`/dashboard/applications/new?job=${jobId}`);
  };

  const formatSalary = (min?: number, max?: number, currency: string = 'USD') => {
    if (!min && !max) return 'Salary not disclosed';
    const formatNumber = (num: number) => {
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
      return `$${num}`;
    };
    if (min && max) return `${formatNumber(min)} - ${formatNumber(max)}`;
    if (min) return `${formatNumber(min)}+`;
    if (max) return `Up to ${formatNumber(max)}`;
    return 'Salary not disclosed';
  };

  const formatPostedDate = (dateString: string) => {
    const posted = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - posted.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getFitIndexColor = (fitIndex: number) => {
    if (fitIndex >= 80) return 'bg-green-500';
    if (fitIndex >= 60) return 'bg-blue-500';
    if (fitIndex >= 40) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-600', text: 'text-green-600' };
    if (score >= 60) return { bg: 'bg-blue-600', text: 'text-blue-600' };
    if (score >= 40) return { bg: 'bg-yellow-600', text: 'text-yellow-600' };
    return { bg: 'bg-gray-600', text: 'text-gray-600' };
  };

  if (isLoading || !currentJob) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  const job = currentJob;
  const matchScore = job.match_score;
  const fitIndex = matchScore?.fit_index || 0;
  const saved = isSaved(jobId);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>
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
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <CardDescription className="text-lg flex items-center gap-2 mt-2">
                    <Building className="h-5 w-5" />
                    {job.company}
                  </CardDescription>
                </div>
                {fitIndex > 0 && (
                  <Badge className={`${getFitIndexColor(fitIndex)} text-lg px-3 py-1`}>
                    <TrendingUp className="mr-1 h-4 w-4" />
                    Fit: {fitIndex}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Job Metadata */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatPostedDate(job.posted_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{job.remote_policy}</Badge>
                  <Badge variant="outline">{job.employment_type}</Badge>
                  {job.is_visa_friendly && <Badge variant="outline">Visa Friendly</Badge>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button size="lg" onClick={handleApply}>
                  Apply Now
                </Button>
                <Button
                  variant={saved ? 'default' : 'outline'}
                  size="lg"
                  onClick={handleSaveJob}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <>
                      <BookmarkCheck className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save Job
                    </>
                  )}
                </Button>
                {job.source_url && (
                  <Button variant="outline" size="lg" asChild>
                    <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Original
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{job.description}</p>

                {job.responsibilities && job.responsibilities.length > 0 && (
                  <>
                    <h3>Responsibilities</h3>
                    <ul>
                      {job.responsibilities.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}

                {job.requirements && job.requirements.length > 0 && (
                  <>
                    <h3>Requirements</h3>
                    <ul>
                      {job.requirements.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}

                {job.preferred_qualifications && job.preferred_qualifications.length > 0 && (
                  <>
                    <h3>Preferred Qualifications</h3>
                    <ul>
                      {job.preferred_qualifications.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}

                {job.benefits && job.benefits.length > 0 && (
                  <>
                    <h3>Benefits</h3>
                    <ul>
                      {job.benefits.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          {job.company_description && (
            <Card>
              <CardHeader>
                <CardTitle>About {job.company}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">{job.company_description}</p>

                  {(job.company_size || job.industry) && (
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      {job.company_size && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{job.company_size}</span>
                        </div>
                      )}
                      {job.industry && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{job.industry}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Match Analysis */}
          {matchScore && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Why This Matches
                </CardTitle>
                <CardDescription>AI analysis of your fit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overall Fit */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Fit</span>
                      <span className="text-sm font-bold">{matchScore.fit_index}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${
                          getScoreColor(matchScore.fit_index).bg
                        } h-2 rounded-full`}
                        style={{ width: `${matchScore.fit_index}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Skills Match */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Skills Match</span>
                      <span className="text-sm font-bold">
                        {Math.round(matchScore.skills_match_score)}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${
                          getScoreColor(matchScore.skills_match_score).bg
                        } h-2 rounded-full`}
                        style={{ width: `${matchScore.skills_match_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Experience Match */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Experience Level</span>
                      <span className="text-sm font-bold">
                        {Math.round(matchScore.experience_match_score)}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${
                          getScoreColor(matchScore.experience_match_score).bg
                        } h-2 rounded-full`}
                        style={{ width: `${matchScore.experience_match_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Location Match */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Location Match</span>
                      <span className="text-sm font-bold">
                        {Math.round(matchScore.location_match_score)}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${
                          getScoreColor(matchScore.location_match_score).bg
                        } h-2 rounded-full`}
                        style={{ width: `${matchScore.location_match_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Salary Match */}
                  {matchScore.salary_match_score > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Salary Match</span>
                        <span className="text-sm font-bold">
                          {Math.round(matchScore.salary_match_score)}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${
                            getScoreColor(matchScore.salary_match_score).bg
                          } h-2 rounded-full`}
                          style={{ width: `${matchScore.salary_match_score}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Match Rationale */}
                {matchScore.match_rationale && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">{matchScore.match_rationale}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills Analysis */}
          {matchScore && (matchScore.matched_skills?.length > 0 || matchScore.missing_skills?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Skills Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Matched Skills */}
                  {matchScore.matched_skills && matchScore.matched_skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-sm">Matched Skills</h4>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {matchScore.matched_skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="bg-green-100">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {matchScore.missing_skills && matchScore.missing_skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-orange-600" />
                        <h4 className="font-semibold text-sm">Skills to Develop</h4>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {matchScore.missing_skills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Consider highlighting transferable skills or willingness to learn.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Application Tips */}
          {matchScore && fitIndex >= 60 && (
            <Card>
              <CardHeader>
                <CardTitle>Application Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {matchScore.matched_skills && matchScore.matched_skills.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-1 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Highlight These Skills
                      </h4>
                      <p className="text-green-700">
                        Emphasize your experience with{' '}
                        {matchScore.matched_skills.slice(0, 3).join(', ')}.
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-1">💡 Personalize</h4>
                    <p className="text-blue-700">
                      Use HireFlux's AI cover letter generator to create a personalized
                      application that highlights your fit.
                    </p>
                  </div>

                  {matchScore.missing_skills && matchScore.missing_skills.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-yellow-800 mb-1">⚠️ Address Gaps</h4>
                      <p className="text-yellow-700">
                        Mention your willingness to learn{' '}
                        {matchScore.missing_skills.slice(0, 2).join(' and ')}.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handleApply}>
                Apply to This Job
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/dashboard/cover-letters/new?job=${jobId}`)}
              >
                Generate Cover Letter
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard/resumes')}
              >
                Tailor Resume
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
