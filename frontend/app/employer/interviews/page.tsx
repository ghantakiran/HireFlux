'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { interviewSchedulingApi, teamCollaborationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/domain/EmptyState';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  Video,
  Users,
  Plus,
  AlertCircle,
  Edit,
  X,
  CheckCircle,
  MessageSquare,
  Star,
} from 'lucide-react';

// Types
interface Interview {
  id: string;
  application_id: string;
  user_id: string;
  interview_type: string;
  interview_round: number;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  meeting_platform: string | null;
  meeting_link: string | null;
  location: string | null;
  interviewer_ids: string[];
  status: 'scheduled' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';
  confirmation_status: 'pending' | 'confirmed' | 'declined';
  reminder_sent: boolean;
  calendar_event_id: string | null;
  calendar_invite_sent: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
}

interface InterviewFeedback {
  id: string;
  interview_id: string;
  interviewer_id: string;
  application_id: string;
  overall_rating: number | null;
  technical_rating: number | null;
  communication_rating: number | null;
  culture_fit_rating: number | null;
  strengths: string[];
  concerns: string[];
  notes: string | null;
  recommendation: string | null;
  next_steps: string | null;
  is_submitted: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  interviewer_name: string;
  interviewer_email: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function InterviewSchedulingPage() {
  const router = useRouter();

  // State
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Interview[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('upcoming');

  // Modal states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  // Schedule form
  const [scheduleForm, setScheduleForm] = useState({
    application_id: '',
    interview_type: 'phone_screen',
    interview_round: 1,
    scheduled_at: '',
    duration_minutes: 30,
    timezone: 'America/New_York',
    meeting_platform: 'zoom',
    meeting_link: '',
    interviewer_ids: [] as string[],
  });

  // Reschedule form
  const [rescheduleForm, setRescheduleForm] = useState({
    new_time: '',
    reason: '',
  });

  // Feedback form
  const [feedbackForm, setFeedbackForm] = useState({
    overall_rating: 0,
    technical_rating: 0,
    communication_rating: 0,
    culture_fit_rating: 0,
    strengths: [] as string[],
    concerns: [] as string[],
    notes: '',
    recommendation: 'maybe',
    next_steps: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    loadInterviews();
    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedTab === 'upcoming') {
      loadUpcomingInterviews();
    }
  }, [selectedTab]);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await interviewSchedulingApi.listInterviews({});

      if (response.data?.data) {
        setInterviews(response.data.data.interviews || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingInterviews = async () => {
    try {
      const response = await interviewSchedulingApi.getUpcomingInterviews({ days: 7 });
      if (response.data?.data) {
        setUpcomingInterviews(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load upcoming interviews:', err);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await teamCollaborationApi.getTeamMembers({});
      if (response.data?.data) {
        setTeamMembers(response.data.data.members || []);
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  // Actions
  const handleScheduleInterview = async () => {
    if (!scheduleForm.application_id || !scheduleForm.scheduled_at || scheduleForm.interviewer_ids.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await interviewSchedulingApi.scheduleInterview(scheduleForm as any);

      setScheduleModalOpen(false);
      resetScheduleForm();
      await loadInterviews();
      await loadUpcomingInterviews();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedInterview || !rescheduleForm.new_time) return;

    try {
      setSubmitting(true);
      setError(null);
      await interviewSchedulingApi.rescheduleInterview(selectedInterview.id, rescheduleForm);

      setRescheduleModalOpen(false);
      setSelectedInterview(null);
      resetRescheduleForm();
      await loadInterviews();
      await loadUpcomingInterviews();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reschedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInterview = async (interviewId: string) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return;

    try {
      setError(null);
      await interviewSchedulingApi.cancelInterview(interviewId, {});
      await loadInterviews();
      await loadUpcomingInterviews();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel interview');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedInterview) return;

    try {
      setSubmitting(true);
      setError(null);
      await interviewSchedulingApi.submitFeedback(selectedInterview.id, feedbackForm as any);

      setFeedbackModalOpen(false);
      setSelectedInterview(null);
      resetFeedbackForm();
      await loadInterviews();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAvailability = async (applicationId: string) => {
    try {
      setError(null);
      await interviewSchedulingApi.requestCandidateAvailability(applicationId, {
        interview_type: 'phone_screen',
        duration_minutes: 30,
        timezone: 'America/New_York',
      });
      alert('Availability request sent to candidate');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to request availability');
    }
  };

  // Helpers
  const resetScheduleForm = () => {
    setScheduleForm({
      application_id: '',
      interview_type: 'phone_screen',
      interview_round: 1,
      scheduled_at: '',
      duration_minutes: 30,
      timezone: 'America/New_York',
      meeting_platform: 'zoom',
      meeting_link: '',
      interviewer_ids: [],
    });
  };

  const resetRescheduleForm = () => {
    setRescheduleForm({ new_time: '', reason: '' });
  };

  const resetFeedbackForm = () => {
    setFeedbackForm({
      overall_rating: 0,
      technical_rating: 0,
      communication_rating: 0,
      culture_fit_rating: 0,
      strengths: [],
      concerns: [],
      notes: '',
      recommendation: 'maybe',
      next_steps: '',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: string } = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      rescheduled: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatInterviewType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (loading && interviews.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Interview Scheduling
          </h1>
          <p className="text-gray-500 mt-2">
            Schedule and manage candidate interviews
          </p>
        </div>
        <Button onClick={() => setScheduleModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6 w-full overflow-x-auto">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingInterviews.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Interviews ({interviews.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>
                Interviews scheduled in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingInterviews.length === 0 ? (
                <EmptyState
                  title="No interviews scheduled"
                  description="Interview schedules will appear here when you advance candidates through your pipeline."
                  icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
                />
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead className="hidden lg:table-cell">Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="hidden lg:table-cell">Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingInterviews.map((interview) => {
                      const { date, time } = formatDateTime(interview.scheduled_at);
                      return (
                        <TableRow key={interview.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{interview.candidate_name}</p>
                              <p className="text-sm text-gray-500">{interview.candidate_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{interview.job_title}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge className="bg-purple-100 text-purple-800">
                              {formatInterviewType(interview.interview_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{date}</p>
                              <p className="text-sm text-gray-500">{time}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {interview.meeting_platform ? (
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                {interview.meeting_platform}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(interview.status)}>
                              {interview.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInterview(interview);
                                setRescheduleModalOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelInterview(interview.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Interviews Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Interviews</CardTitle>
              <CardDescription>
                Complete interview history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <EmptyState
                  title="No interviews scheduled"
                  description="Interview schedules will appear here when you advance candidates through your pipeline."
                  icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
                />
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Round</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.map((interview) => {
                      const { date, time } = formatDateTime(interview.scheduled_at);
                      return (
                        <TableRow key={interview.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{interview.candidate_name}</p>
                              <p className="text-sm text-gray-500">{interview.job_title}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatInterviewType(interview.interview_type)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">Round {interview.interview_round}</TableCell>
                          <TableCell>
                            <div>
                              <p>{date}</p>
                              <p className="text-sm text-gray-500">{time}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(interview.status)}>
                              {interview.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {interview.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInterview(interview);
                                  setFeedbackModalOpen(true);
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Feedback
                              </Button>
                            )}
                            {interview.meeting_link && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(interview.meeting_link!, '_blank')}
                              >
                                <Video className="h-3 w-3 mr-1" />
                                Join
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Interviews</CardTitle>
              <CardDescription>
                Interviews that have been conducted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.filter(i => i.status === 'completed').length === 0 ? (
                <EmptyState
                  title="No interviews scheduled"
                  description="Interview schedules will appear here when you advance candidates through your pipeline."
                  icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
                />
              ) : (
                <div className="space-y-4">
                  {interviews
                    .filter(i => i.status === 'completed')
                    .map((interview) => (
                      <div key={interview.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{interview.candidate_name}</h3>
                            <p className="text-sm text-gray-600">{interview.job_title}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>{formatInterviewType(interview.interview_type)}</span>
                              <span>Round {interview.interview_round}</span>
                              <span>{formatDateTime(interview.scheduled_at).date}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInterview(interview);
                              setFeedbackModalOpen(true);
                            }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Submit Feedback
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Interview Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Schedule a new interview with a candidate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="application-id">Application ID</Label>
              <Input
                id="application-id"
                placeholder="app-123"
                value={scheduleForm.application_id}
                onChange={(e) => setScheduleForm({ ...scheduleForm, application_id: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="interview-type">Interview Type</Label>
                <Select
                  value={scheduleForm.interview_type}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, interview_type: v })}
                >
                  <SelectTrigger id="interview-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone_screen">Phone Screen</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="cultural_fit">Cultural Fit</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="round">Round</Label>
                <Input
                  id="round"
                  type="number"
                  min="1"
                  value={scheduleForm.interview_round}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, interview_round: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled-at">Date & Time</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduleForm.scheduled_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={scheduleForm.duration_minutes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="platform">Meeting Platform</Label>
                <Select
                  value={scheduleForm.meeting_platform}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, meeting_platform: v })}
                >
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="meeting-link">Meeting Link</Label>
                <Input
                  id="meeting-link"
                  placeholder="https://zoom.us/j/..."
                  value={scheduleForm.meeting_link}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, meeting_link: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="interviewers">Interviewers</Label>
              <Select
                value={scheduleForm.interviewer_ids.join(',')}
                onValueChange={(v) => setScheduleForm({ ...scheduleForm, interviewer_ids: v.split(',') })}
              >
                <SelectTrigger id="interviewers">
                  <SelectValue placeholder="Select interviewers" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleInterview} disabled={submitting}>
              {submitting ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Interview</DialogTitle>
            <DialogDescription>
              Change the interview time for {selectedInterview?.candidate_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-time">New Date & Time</Label>
              <Input
                id="new-time"
                type="datetime-local"
                value={rescheduleForm.new_time}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, new_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Interviewer conflict..."
                value={rescheduleForm.reason}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={submitting}>
              {submitting ? 'Rescheduling...' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Interview Feedback</DialogTitle>
            <DialogDescription>
              Provide feedback for {selectedInterview?.candidate_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="overall-rating">Overall Rating</Label>
                <Select
                  value={feedbackForm.overall_rating.toString()}
                  onValueChange={(v) => setFeedbackForm({ ...feedbackForm, overall_rating: parseInt(v) })}
                >
                  <SelectTrigger id="overall-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="technical-rating">Technical Rating</Label>
                <Select
                  value={feedbackForm.technical_rating.toString()}
                  onValueChange={(v) => setFeedbackForm({ ...feedbackForm, technical_rating: parseInt(v) })}
                >
                  <SelectTrigger id="technical-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="communication-rating">Communication Rating</Label>
                <Select
                  value={feedbackForm.communication_rating.toString()}
                  onValueChange={(v) => setFeedbackForm({ ...feedbackForm, communication_rating: parseInt(v) })}
                >
                  <SelectTrigger id="communication-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="culture-fit-rating">Culture Fit Rating</Label>
                <Select
                  value={feedbackForm.culture_fit_rating.toString()}
                  onValueChange={(v) => setFeedbackForm({ ...feedbackForm, culture_fit_rating: parseInt(v) })}
                >
                  <SelectTrigger id="culture-fit-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Fair</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional feedback..."
                rows={4}
                value={feedbackForm.notes}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="recommendation">Recommendation</Label>
              <Select
                value={feedbackForm.recommendation}
                onValueChange={(v) => setFeedbackForm({ ...feedbackForm, recommendation: v })}
              >
                <SelectTrigger id="recommendation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes - Move Forward</SelectItem>
                  <SelectItem value="maybe">Maybe - Needs Discussion</SelectItem>
                  <SelectItem value="no">No - Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="next-steps">Next Steps</Label>
              <Textarea
                id="next-steps"
                placeholder="Recommended next steps..."
                value={feedbackForm.next_steps}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, next_steps: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
