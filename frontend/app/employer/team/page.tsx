'use client';

import { useState, useEffect } from 'react';
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
  AlertCircle,
} from 'lucide-react';

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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('recruiter');
  const [inviting, setInviting] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState(false);

  const [activityDays, setActivityDays] = useState(7);

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
  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteRole) return;

    try {
      setInviting(true);
      setError(null);
      await teamCollaborationApi.inviteTeamMember({
        email: inviteEmail,
        role: inviteRole as any,
      });

      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('recruiter');
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.resendInvitation(invitationId);
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend invitation');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.revokeInvitation(invitationId);
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke invitation');
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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleSuspendMember = async (memberId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.suspendMember(memberId, {});
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to suspend member');
    }
  };

  const handleReactivateMember = async (memberId: string) => {
    try {
      setError(null);
      await teamCollaborationApi.reactivateMember(memberId);
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reactivate member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      setError(null);
      await teamCollaborationApi.removeMember(memberId);
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
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

  const formatRole = (role: string) => {
    return role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
      <div className="flex items-center justify-between mb-8">
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
        <TabsList className="mb-6">
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
              <div className="flex items-center justify-between">
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
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No team members found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Joined</TableHead>
                      {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {formatRole(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Suspended</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.last_active_at
                            ? formatTimestamp(member.last_active_at)
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {new Date(member.joined_at).toLocaleDateString()}
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
                                  onClick={() => handleRemoveMember(member.id)}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
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
                            {formatRole(invitation.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.expires_at).toLocaleDateString()}
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
                          {formatTimestamp(activity.created_at)}
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
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={inviting || !inviteEmail}>
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
    </div>
  );
}
