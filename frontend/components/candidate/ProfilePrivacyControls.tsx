/**
 * Profile Privacy Controls Component - Issue #57
 *
 * Allows candidates to control what information is visible on their public profile.
 *
 * Privacy Options:
 * - Show/hide salary expectations
 * - Show/hide contact information (email/phone)
 * - Show/hide exact location (country vs full address)
 *
 * Following BDD scenarios from:
 * tests/features/candidate-profile-visibility.feature
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, DollarSign, Mail, MapPin } from 'lucide-react';

interface PrivacySettings {
  showSalary: boolean;
  showContact: boolean;
  showLocation: boolean;
}

interface ProfilePrivacyControlsProps {
  settings: PrivacySettings;
  onChange: (settings: PrivacySettings) => void;
  disabled?: boolean;
}

export default function ProfilePrivacyControls({
  settings,
  onChange,
  disabled = false,
}: ProfilePrivacyControlsProps) {
  const handleToggle = (field: keyof PrivacySettings) => {
    onChange({
      ...settings,
      [field]: !settings[field],
    });
  };

  return (
    <div className="space-y-6" data-testid="privacy-controls">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold">Privacy Controls</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Control what information employers can see on your public profile
        </p>
      </div>

      {/* Privacy Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your privacy is important. You can update these settings anytime. Employers will
          only see what you choose to share.
        </AlertDescription>
      </Alert>

      {/* Privacy Controls */}
      <div className="space-y-4">
        {/* Salary Expectations */}
        <div
          className="flex items-center justify-between space-x-4 rounded-lg border p-4"
          data-testid="salary-privacy-control"
        >
          <div className="flex items-start gap-3 flex-1">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label
                htmlFor="show-salary"
                className="text-base font-medium cursor-pointer"
              >
                Show Salary Expectations
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {settings.showSalary
                  ? 'Employers can see your salary range'
                  : 'Your salary expectations are hidden from employers'}
              </p>
            </div>
          </div>
          <Switch
            id="show-salary"
            checked={settings.showSalary}
            onCheckedChange={() => handleToggle('showSalary')}
            disabled={disabled}
            data-testid="salary-toggle"
          />
        </div>

        {/* Contact Information */}
        <div
          className="flex items-center justify-between space-x-4 rounded-lg border p-4"
          data-testid="contact-privacy-control"
        >
          <div className="flex items-start gap-3 flex-1">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label
                htmlFor="show-contact"
                className="text-base font-medium cursor-pointer"
              >
                Show Email Address
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {settings.showContact
                  ? 'Employers can see your email address'
                  : 'Contact via HireFlux only - email is hidden'}
              </p>
              {!settings.showContact && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  ✓ Recommended for privacy and spam protection
                </p>
              )}
            </div>
          </div>
          <Switch
            id="show-contact"
            checked={settings.showContact}
            onCheckedChange={() => handleToggle('showContact')}
            disabled={disabled}
            data-testid="contact-toggle"
          />
        </div>

        {/* Location */}
        <div
          className="flex items-center justify-between space-x-4 rounded-lg border p-4"
          data-testid="location-privacy-control"
        >
          <div className="flex items-start gap-3 flex-1">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label
                htmlFor="show-location"
                className="text-base font-medium cursor-pointer"
              >
                Show Exact Location
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {settings.showLocation
                  ? 'Employers can see your city and state'
                  : 'Only your country is visible to employers'}
              </p>
            </div>
          </div>
          <Switch
            id="show-location"
            checked={settings.showLocation}
            onCheckedChange={() => handleToggle('showLocation')}
            disabled={disabled}
            data-testid="location-toggle"
          />
        </div>
      </div>

      {/* Privacy Summary */}
      <div className="rounded-lg bg-muted/50 p-4">
        <h4 className="mb-2 text-sm font-medium">What Employers See</h4>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            {settings.showSalary ? (
              <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-400" />
            )}
            Salary expectations: {settings.showSalary ? 'Visible' : 'Hidden'}
          </li>
          <li className="flex items-center gap-2">
            {settings.showContact ? (
              <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-400" />
            )}
            Email address: {settings.showContact ? 'Visible' : 'Hidden'}
          </li>
          <li className="flex items-center gap-2">
            {settings.showLocation ? (
              <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-400" />
            )}
            Location: {settings.showLocation ? 'Full address' : 'Country only'}
          </li>
        </ul>
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        💡 Tip: Hiding your email prevents spam but may reduce direct employer contact.
        Consider showing salary to attract better-matched opportunities.
      </p>
    </div>
  );
}
