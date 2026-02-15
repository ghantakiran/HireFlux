'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { teamInviteSchema, TeamInviteFormData } from '@/lib/validations/schemas';
import { useRouter } from 'next/navigation';
import { teamCollaborationApi } from '@/lib/api';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserPlus,
  MoreVertical,
  Mail,
  Trash2,
  UserCheck,
  UserX,
  Activity,
  Clock,
} from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmptyState } from '@/components/domain/EmptyState';
import { toast } from 'sonner';
import { titleCase, formatRelativeTime, formatDate } from '@/lib/utils';

// Types
interface TeamMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'hiring_manager' | 'recruiter' | 'interviewer' | 'viewer';
  status: 'active' | 'suspended';
  email: string;
  full_name: string;
  last_active_at: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

interface TeamInvitation {
  id: string;
  company_id: string;
  email: string;
  role: string;
  invited_by: string;
  invitation_token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamActivity {
  id: string;
  company_id: string;
  member_id: string;
  user_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  member_name: string;
  member_email: string;
  created_at: string;
}

interface PermissionMatrix {
  member_id: string;
  role: string;
  permissions: {
    [key: string]: boolean;
  };
}

export default function TeamManagementPage() {
  const router = useRouter();

  // State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('members');
  const [includeSuspended, setIncludeSuspended] = useState(false);

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const {
    register: inviteRegister,
    handleSubmit: inviteHandleSubmit,
    control: inviteControl,
    reset: inviteReset,
    formState: { errors: inviteErrors, isValid: inviteIsValid },
  } = useForm<TeamInviteFormData>({
    resolver: zodResolver(teamInviteSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      role: 'recruiter',
    },
  });
  const [inviting, setInviting] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState(false);

  const [activityDays, setActivityDays] = useState(7);

  // Remove member confirmation
  const removeDialog = useConfirmDialog({
    onConfirm: async (memberId) => {
      await teamCollaborationApi.removeMember(memberId);
      await loadTeamData();
    },
    successMessage: 'Team member removed',
    errorMessage: 'Failed to remove member. Please try again.',
  });

  // Set page metadata
  useEffect(() => {
    document.title = 'Team | HireFlux';
  }, []);

  // Load data
  useEffect(() => {
    loadTeamData();
    loadPermissions();
  }, [includeSuspended]);

  useEffect(() => {
    if (selectedTab === 'activity') {
      loadActivity();
    }
  }, [selectedTab, activityDays]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamCollaborationApi.getTeamMembers({
        include_suspended: includeSuspended,
      });

      if (response.data?.data) {
        setMembers(response.data.data.members || []);
        setInvitations(response.data.data.pending_invitations || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await teamCollaborationApi.getMyPermissions();
      if (response.data?.data) {
        setPermissions(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  const loadActivity = async () => {
    try {
      const response = await teamCollaborationApi.getTeamActivity({ days: activityDays });
      if (response.data?.data) {
        setActivities(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  };

  // Actions
  const handleInviteMember = inviteHandleSubmit(async (data) => {
    try {
      setInviting(true);
      setError(null);
      await teamCollaborationApi.inviteTeamMember({
        email: data.email,
        role: data.role as any,
      });

      setInviteModalOpen(false);
      inviteReset();
      await loadTeamData();
      toast.success('Invitation sent');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send invitation');
      toast.error('Failed to update team. Please try again.');
    } finally {
      setInviting(false);
    }
  });

  const handleResendInvitation = async (invitationId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.resendInvitation(invitationId);
      await loadTeamData();
      toast.success('Invitation resent');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend invitation');
      toast.error('Failed to update team. Please try again.');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.revokeInvitation(invitationId);
      await loadTeamData();
      toast.success('Invitation revoked');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke invitation');
      toast.error('Failed to update team. Please try again.');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember || !newRole) return;

    try {
      setUpdatingRole(true);
      setError(null);
      await teamCollaborationApi.updateMemberRole(selectedMember.id, {
        role: newRole as any,
      });

      setRoleModalOpen(false);
      setSelectedMember(null);
      setNewRole('');
      await loadTeamData();
      toast.success('Role updated');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
      toast.error('Failed to update team. Please try again.');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleSuspendMember = async (memberId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.suspendMember(memberId, {});
      await loadTeamData();
      toast.success('Team member suspended');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to suspend member');
      toast.error('Failed to update team. Please try again.');
    }
  };

  const handleReactivateMember = async (memberId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.reactivateMember(memberId);
      await loadTeamData();
      toast.success('Team member reactivated');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reactivate member');
      toast.error('Failed to update team. Please try again.');
    }
  };

  // Helpers
  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      hiring_manager: 'bg-green-100 text-green-800',
      recruiter: 'bg-yellow-100 text-yellow-800',
      interviewer: 'bg-orange-100 text-orange-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const canManageTeam = permissions?.permissions?.manage_team ?? false;

  if (loading && members.length === 0) {
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
            <Users className="h-8 w-8" />
            Team Management
          </h1>
          <p className="text-gray-500 mt-2">
            Manage your team members, roles, and permissions
          </p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Error Alert */}
      <ErrorBanner error={error} />

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6 w-full overflow-x-auto">
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invitations ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    View and manage your team members
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeSuspended}
                      onChange={(e) => setIncludeSuspended(e.target.checked)}
                      className="rounded"
                    />
                    Show suspended
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <EmptyState
                  title="No team members"
                  description="Invite team members to collaborate on hiring and candidate evaluation."
                  icon={<Users className="h-12 w-12 text-muted-foreground" />}
                  actionLabel="Invite Member"
                  onAction={() => setInviteModalOpen(true)}
                />
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Last Active</TableHead>
                      <TableHead className="hidden md:table-cell">Joined</TableHead>
                      {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell className="hidden md:table-cell">{member.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {titleCase(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Suspended</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {member.last_active_at
                            ? formatRelativeTime(member.last_active_at)
                            : 'Never'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(member.joined_at)}
                        </TableCell>
                        {canManageTeam && member.role !== 'owner' && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setNewRole(member.role);
                                    setRoleModalOpen(true);
                                  }}
                                >
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {member.status === 'active' ? (
                                  <DropdownMenuItem
                                    onClick={() => handleSuspendMember(member.id)}
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleReactivateMember(member.id)}
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => removeDialog.open(member.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Manage pending team invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No pending invitations</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Expires</TableHead>
                      <TableHead>Status</TableHead>
                      {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(invitation.role)}>
                            {titleCase(invitation.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(invitation.expires_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {invitation.status}
                          </Badge>
                        </TableCell>
                        {canManageTeam && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleResendInvitation(invitation.id)}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Resend
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRevokeInvitation(invitation.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Revoke
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Activity</CardTitle>
                  <CardDescription>
                    Recent team member actions and events
                  </CardDescription>
                </div>
                <Select
                  value={activityDays.toString()}
                  onValueChange={(v) => setActivityDays(parseInt(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24h</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="p-2 bg-blue-50 rounded-full">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.member_name}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(activity.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                {...inviteRegister('email')}
              />
              {inviteErrors.email && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">
                  {inviteErrors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={inviteControl}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                      <SelectItem value="interviewer">Interviewer</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {inviteErrors.role && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">
                  {inviteErrors.role.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={inviting || !inviteIsValid}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Role Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="new-role">New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger id="new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="interviewer">Interviewer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole || !newRole}>
              {updatingRole ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        open={removeDialog.isOpen}
        onOpenChange={() => removeDialog.close()}
        title="Remove Team Member"
        description="Are you sure you want to remove this team member? They will lose access to the employer dashboard."
        confirmLabel="Remove"
        isConfirming={removeDialog.isConfirming}
        onConfirm={removeDialog.confirm}
      />
    </div>
  );
}
