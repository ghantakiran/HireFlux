/**
 * Profile Visibility Toggle Component - Issue #57
 *
 * Main toggle for making candidate profile public or private.
 * Validates completeness before allowing public visibility.
 *
 * Following BDD scenarios from:
 * tests/features/candidate-profile-visibility.feature
 */

'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, AlertCircle, Eye, Users } from 'lucide-react';

interface ProfileVisibilityToggleProps {
  isPublic: boolean;
  completenessPercentage: number;
  missingRequiredFields: string[];
  onToggle: (isPublic: boolean) => Promise<void>;
  disabled?: boolean;
}

export default function ProfileVisibilityToggle({
  isPublic,
  completenessPercentage,
  missingRequiredFields,
  onToggle,
  disabled = false,
}: ProfileVisibilityToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if profile can be made public
  // Only require 50% completeness, missing fields are suggestions not blockers
  const canBePublic = completenessPercentage >= 50;

  const handleToggle = async () => {
    // Prevent toggling to public if requirements not met
    if (!isPublic && !canBePublic) {
      setError(
        `Complete at least 50% of your profile to make it public (currently ${completenessPercentage}%)`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onToggle(!isPublic);
    } catch (err: any) {
      setError(err.message || 'Failed to update visibility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="profile-visibility-toggle">
      {/* Main Toggle */}
      <div className="rounded-lg border-2 border-dashed p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4 flex-1">
            {isPublic ? (
              <Globe className="h-6 w-6 text-green-600 mt-0.5" />
            ) : (
              <Lock className="h-6 w-6 text-gray-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="visibility-toggle" className="text-lg font-semibold cursor-pointer">
                  Profile Visibility
                </Label>
                <Badge
                  variant={isPublic ? 'default' : 'secondary'}
                  data-testid="visibility-status-badge"
                >
                  {isPublic ? 'Public' : 'Private'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPublic
                  ? 'Your profile is visible to employers and can be discovered in searches'
                  : 'Your profile is private and only visible to you'}
              </p>
            </div>
          </div>
          <Switch
            id="visibility-toggle"
            checked={isPublic}
            onCheckedChange={handleToggle}
            disabled={disabled || loading || (!isPublic && !canBePublic)}
            data-testid="visibility-switch"
          />
        </div>

        {/* Status Message */}
        {isPublic ? (
          <Alert className="mt-4" data-testid="public-status-message">
            <Users className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Your profile is now public.</span> Employers can
              discover your profile and send you job invitations.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="secondary" className="mt-4" data-testid="private-status-message">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Your profile is now private.</span> Only you can see
              your profile. Make it public to get discovered by employers.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Validation Error */}
      {error && (
        <Alert variant="destructive" data-testid="visibility-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Requirements Not Met Warning */}
      {!isPublic && !canBePublic && !error && (
        <Alert variant="destructive" data-testid="requirements-warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Cannot make profile public yet</div>
            <p className="text-sm">
              Profile must be at least 50% complete (currently {completenessPercentage}%)
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Benefits of Public Profile */}
      {!isPublic && canBePublic && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                ✨ Ready to go public!
              </h4>
              <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <li>• Get discovered by employers actively hiring</li>
                <li>• Receive direct job invitations</li>
                <li>• Increase your visibility by up to 10x</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {isPublic && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Profile Views</div>
            <p className="mt-1 text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Invites Received</div>
            <p className="mt-1 text-xs text-muted-foreground">All time</p>
          </div>
        </div>
      )}
    </div>
  );
}
