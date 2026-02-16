"use client";

/**
 * API Key Management Page - Sprint 17-18
 *
 * Employer dashboard page for managing API keys for public API access.
 *
 * Features:
 * - List all API keys with status
 * - Create new API keys with permissions
 * - View usage statistics
 * - Revoke API keys
 * - Copy keys to clipboard (only shown once on creation)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/domain/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Copy, Key, Plus, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';

interface APIKey {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  key?: string; // Only present on creation
  permissions: {
    jobs: string[];
    candidates: string[];
    applications: string[];
    webhooks: string[];
    analytics: string[];
  };
  rate_limit_tier: 'standard' | 'elevated' | 'enterprise';
  rate_limit_requests_per_minute: number;
  rate_limit_requests_per_hour: number;
  last_used_at?: string;
  last_used_ip?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  revoked_at?: string;
  status: 'active' | 'revoked' | 'expired';
}

interface CreateAPIKeyData {
  name: string;
  permissions: {
    jobs: string[];
    candidates: string[];
    applications: string[];
    webhooks: string[];
    analytics: string[];
  };
  rate_limit_tier: 'standard' | 'elevated' | 'enterprise';
  expires_at?: string;
}

export default function APIKeysPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  // Revoke confirmation
  const revokeDialog = useConfirmDialog({
    onConfirm: async (keyId) => {
      await apiKeyApi.revoke(keyId);
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
    successMessage: 'API key revoked successfully',
    onError: (error) => {
      const detail = (error as any).response?.data?.detail;
      toast.error(detail || 'Failed to revoke API key');
    },
  });

  // Form state for creating API key
  const [formData, setFormData] = useState<CreateAPIKeyData>({
    name: '',
    permissions: {
      jobs: ['read'],
      candidates: ['read'],
      applications: ['read'],
      webhooks: [],
      analytics: [],
    },
    rate_limit_tier: 'standard',
  });

  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const response = await apiKeyApi.list();
      return response.data.keys as APIKey[];
    },
  });

  // Create API key mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAPIKeyData) => apiKeyApi.create(data),
    onSuccess: (response) => {
      const apiKey = response.data as APIKey;
      setNewlyCreatedKey(apiKey.key || null);
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setIsCreateDialogOpen(false);
      toast.success('API key created successfully');

      // Reset form
      setFormData({
        name: '',
        permissions: {
          jobs: ['read'],
          candidates: ['read'],
          applications: ['read'],
          webhooks: [],
          analytics: [],
        },
        rate_limit_tier: 'standard',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create API key');
    },
  });


  const handleCreateKey = () => {
    createMutation.mutate(formData);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const handlePermissionToggle = (
    resource: keyof CreateAPIKeyData['permissions'],
    action: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: checked
          ? [...prev.permissions[resource], action]
          : prev.permissions[resource].filter((a) => a !== action),
      },
    }));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'destructive'> = {
      active: 'success',
      revoked: 'destructive',
      expired: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  const getRateLimitBadge = (tier: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      standard: 'default',
      elevated: 'secondary',
      enterprise: 'outline',
    };
    return <Badge variant={variants[tier] || 'default'}>{tier.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys for programmatic access to HireFlux
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Alert for plan requirement */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Professional Plan Required</h3>
              <p className="text-sm text-blue-700 mt-1">
                API access is available on Professional and Enterprise plans.
                Upgrade your plan to create and manage API keys.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Newly created key display (one-time show) */}
      {newlyCreatedKey && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">API Key Created Successfully</CardTitle>
            <CardDescription className="text-green-700">
              Copy this key now - you won't be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={newlyCreatedKey}
                readOnly
                className="font-mono text-sm bg-white"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopyKey(newlyCreatedKey)}
                aria-label="Copy API key"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => setNewlyCreatedKey(null)}
            >
              I've saved my key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage your API keys for programmatic access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading API keys...</div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {key.key_prefix}...
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(key.status)}</TableCell>
                    <TableCell>{getRateLimitBadge(key.rate_limit_tier)}</TableCell>
                    <TableCell>
                      {key.last_used_at
                        ? format(new Date(key.last_used_at), 'MMM d, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(key.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={key.status !== 'active'}
                          onClick={() => revokeDialog.open(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No API keys generated"
              description="Create API keys to integrate HireFlux with your ATS or custom applications. Manage access and monitor usage."
              icon={<Key className="h-12 w-12 text-muted-foreground" />}
              actionLabel="Generate API Key"
              onAction={() => setIsCreateDialogOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access to HireFlux
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Production API Key"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Rate Limit Tier */}
            <div className="space-y-2">
              <Label htmlFor="tier">Rate Limit Tier</Label>
              <Select
                value={formData.rate_limit_tier}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, rate_limit_tier: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    Standard (60/min, 3,000/hour)
                  </SelectItem>
                  <SelectItem value="elevated">
                    Elevated (120/min, 6,000/hour)
                  </SelectItem>
                  <SelectItem value="enterprise">
                    Enterprise (300/min, 15,000/hour)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <Label>Permissions</Label>

              {/* Jobs */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Jobs</p>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="jobs-read"
                      checked={formData.permissions.jobs.includes('read')}
                      onChange={(e) =>
                        handlePermissionToggle('jobs', 'read', e.target.checked)
                      }
                    />
                    <label htmlFor="jobs-read" className="text-sm">
                      Read
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="jobs-write"
                      checked={formData.permissions.jobs.includes('write')}
                      onChange={(e) =>
                        handlePermissionToggle('jobs', 'write', e.target.checked)
                      }
                    />
                    <label htmlFor="jobs-write" className="text-sm">
                      Write
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="jobs-delete"
                      checked={formData.permissions.jobs.includes('delete')}
                      onChange={(e) =>
                        handlePermissionToggle('jobs', 'delete', e.target.checked)
                      }
                    />
                    <label htmlFor="jobs-delete" className="text-sm">
                      Delete
                    </label>
                  </div>
                </div>
              </div>

              {/* Candidates */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Candidates</p>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="candidates-read"
                      checked={formData.permissions.candidates.includes('read')}
                      onChange={(e) =>
                        handlePermissionToggle('candidates', 'read', e.target.checked)
                      }
                    />
                    <label htmlFor="candidates-read" className="text-sm">
                      Read
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="candidates-write"
                      checked={formData.permissions.candidates.includes('write')}
                      onChange={(e) =>
                        handlePermissionToggle('candidates', 'write', e.target.checked)
                      }
                    />
                    <label htmlFor="candidates-write" className="text-sm">
                      Write
                    </label>
                  </div>
                </div>
              </div>

              {/* Applications */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Applications</p>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="applications-read"
                      checked={formData.permissions.applications.includes('read')}
                      onChange={(e) =>
                        handlePermissionToggle('applications', 'read', e.target.checked)
                      }
                    />
                    <label htmlFor="applications-read" className="text-sm">
                      Read
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="applications-write"
                      checked={formData.permissions.applications.includes('write')}
                      onChange={(e) =>
                        handlePermissionToggle('applications', 'write', e.target.checked)
                      }
                    />
                    <label htmlFor="applications-write" className="text-sm">
                      Write
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        open={revokeDialog.isOpen}
        onOpenChange={() => revokeDialog.close()}
        title="Revoke API Key?"
        description="This action cannot be undone. The API key will be permanently revoked and will no longer work."
        confirmLabel="Revoke Key"
        isConfirming={revokeDialog.isConfirming}
        onConfirm={revokeDialog.confirm}
      />
    </div>
  );
}
