/**
 * Notification Settings Component - Sprint 19-20 Week 39 Day 4 - Issue #21
 *
 * Manages notification preferences for company:
 * - Email notifications (new_application, stage_change, team_mention, weekly_digest)
 * - In-app notifications (new_application, team_activity, stage_change)
 * - Enable All / Disable All quick actions
 *
 * BDD Scenarios:
 * - Configure email notification preferences
 * - Configure in-app notification preferences
 * - Toggle all notifications on/off
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Mail, Bell, BellOff } from 'lucide-react';

interface NotificationPreferences {
  new_application: boolean;
  stage_change: boolean;
  team_mention: boolean;
  weekly_digest: boolean;
}

interface NotificationSettingsData {
  email: NotificationPreferences;
  in_app: {
    new_application: boolean;
    team_activity: boolean;
    stage_change: boolean;
  };
}

interface NotificationSettingsProps {
  settings?: NotificationSettingsData;
  onChange: (settings: NotificationSettingsData) => void;
}

const DEFAULT_SETTINGS: NotificationSettingsData = {
  email: {
    new_application: true,
    stage_change: true,
    team_mention: true,
    weekly_digest: false,
  },
  in_app: {
    new_application: true,
    team_activity: true,
    stage_change: false,
  },
};

export function NotificationSettings({ settings, onChange }: NotificationSettingsProps) {
  const currentSettings = settings || DEFAULT_SETTINGS;

  const handleEmailToggle = (key: keyof NotificationPreferences, value: boolean) => {
    onChange({
      ...currentSettings,
      email: {
        ...currentSettings.email,
        [key]: value,
      },
    });
  };

  const handleInAppToggle = (
    key: keyof NotificationSettingsData['in_app'],
    value: boolean
  ) => {
    onChange({
      ...currentSettings,
      in_app: {
        ...currentSettings.in_app,
        [key]: value,
      },
    });
  };

  const handleEnableAll = () => {
    onChange({
      email: {
        new_application: true,
        stage_change: true,
        team_mention: true,
        weekly_digest: true,
      },
      in_app: {
        new_application: true,
        team_activity: true,
        stage_change: true,
      },
    });
  };

  const handleDisableAll = () => {
    onChange({
      email: {
        new_application: false,
        stage_change: false,
        team_mention: false,
        weekly_digest: false,
      },
      in_app: {
        new_application: false,
        team_activity: false,
        stage_change: false,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleEnableAll}
          className="gap-2"
        >
          <Bell className="h-4 w-4" />
          Enable All Notifications
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDisableAll}
          className="gap-2"
        >
          <BellOff className="h-4 w-4" />
          Disable All Notifications
        </Button>
      </div>

      {/* Email Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3>Email Notifications</h3>
        </div>

        <div className="space-y-4 ml-7">
          {/* New Application */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="email-new-application" className="text-base font-medium">
                New Application
              </Label>
              <p className="text-sm text-gray-500">
                Receive email when a candidate applies to your job posting
              </p>
            </div>
            <Switch
              id="email-new-application"
              checked={currentSettings.email.new_application}
              onCheckedChange={(checked) =>
                handleEmailToggle('new_application', checked)
              }
            />
          </div>

          {/* Stage Change */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="email-stage-change" className="text-base font-medium">
                Application Stage Change
              </Label>
              <p className="text-sm text-gray-500">
                Receive email when an application moves to a different stage
              </p>
            </div>
            <Switch
              id="email-stage-change"
              checked={currentSettings.email.stage_change}
              onCheckedChange={(checked) => handleEmailToggle('stage_change', checked)}
            />
          </div>

          {/* Team Mention */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="email-team-mention" className="text-base font-medium">
                Team Mention
              </Label>
              <p className="text-sm text-gray-500">
                Receive email when a team member mentions you in a note or comment
              </p>
            </div>
            <Switch
              id="email-team-mention"
              checked={currentSettings.email.team_mention}
              onCheckedChange={(checked) => handleEmailToggle('team_mention', checked)}
            />
          </div>

          {/* Weekly Digest */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="email-weekly-digest" className="text-base font-medium">
                Weekly Digest
              </Label>
              <p className="text-sm text-gray-500">
                Receive a summary email every Monday with key metrics and updates
              </p>
            </div>
            <Switch
              id="email-weekly-digest"
              checked={currentSettings.email.weekly_digest}
              onCheckedChange={(checked) => handleEmailToggle('weekly_digest', checked)}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* In-App Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5 text-green-600" />
          <h3>In-App Notifications</h3>
        </div>

        <div className="space-y-4 ml-7">
          {/* New Application */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="inapp-new-application" className="text-base font-medium">
                New Application
              </Label>
              <p className="text-sm text-gray-500">
                Show notification badge when a candidate applies
              </p>
            </div>
            <Switch
              id="inapp-new-application"
              checked={currentSettings.in_app.new_application}
              onCheckedChange={(checked) =>
                handleInAppToggle('new_application', checked)
              }
            />
          </div>

          {/* Team Activity */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="inapp-team-activity" className="text-base font-medium">
                Team Activity
              </Label>
              <p className="text-sm text-gray-500">
                Show notifications for team member actions (notes, status changes, etc.)
              </p>
            </div>
            <Switch
              id="inapp-team-activity"
              checked={currentSettings.in_app.team_activity}
              onCheckedChange={(checked) => handleInAppToggle('team_activity', checked)}
            />
          </div>

          {/* Stage Change */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="inapp-stage-change" className="text-base font-medium">
                Application Stage Change
              </Label>
              <p className="text-sm text-gray-500">
                Show notification when an application moves to a different stage
              </p>
            </div>
            <Switch
              id="inapp-stage-change"
              checked={currentSettings.in_app.stage_change}
              onCheckedChange={(checked) => handleInAppToggle('stage_change', checked)}
            />
          </div>
        </div>
      </div>

      {/* Information Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">About Notifications</p>
        <p>
          These preferences apply to all members of your company. Individual team members
          can override these settings in their personal preferences.
        </p>
      </div>
    </div>
  );
}
