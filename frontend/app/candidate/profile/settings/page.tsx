/**
 * Candidate Profile Settings Page - Issue #57
 *
 * Main page integrating all profile visibility and privacy components.
 *
 * Components integrated:
 * - ProfileVisibilityToggle: Main public/private toggle
 * - ProfileCompletenessMeter: Progress tracking
 * - ProfilePrivacyControls: Granular privacy settings
 * - PortfolioManagement: Portfolio items showcase
 *
 * Following BDD scenarios from:
 * tests/features/candidate-profile-visibility.feature
 */

'use client';

import React, { useState, useEffect } from 'react';
import ProfileVisibilityToggle from '@/components/candidate/ProfileVisibilityToggle';
import ProfileCompletenessMeter from '@/components/candidate/ProfileCompletenessMeter';
import ProfilePrivacyControls from '@/components/candidate/ProfilePrivacyControls';
import PortfolioManagement, {
  PortfolioItem,
} from '@/components/candidate/PortfolioManagement';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, AlertCircle, Eye, Settings } from 'lucide-react';
import { getErrorMessage } from '@/lib/api-error-handler';

interface PrivacySettings {
  showSalary: boolean;
  showContact: boolean;
  showLocation: boolean;
}

interface ProfileData {
  isPublic: boolean;
  completenessPercentage: number;
  missingRequiredFields: string[];
  privacySettings: PrivacySettings;
  portfolioItems: PortfolioItem[];
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData>({
    isPublic: false,
    completenessPercentage: 0,
    missingRequiredFields: [],
    privacySettings: {
      showSalary: false,
      showContact: false,
      showLocation: true,
    },
    portfolioItems: [],
  });

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Set page metadata
  useEffect(() => {
    document.title = 'Profile Settings | HireFlux';
  }, []);

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/candidates/profile');
      // const data = await response.json();

      // Mock data for now
      const mockData: ProfileData = {
        isPublic: false,
        completenessPercentage: 65,
        missingRequiredFields: ['portfolio', 'resume_summary', 'expected_salary_min'],
        privacySettings: {
          showSalary: false,
          showContact: false,
          showLocation: true,
        },
        portfolioItems: [],
      };

      setProfile(mockData);
    } catch (error: unknown) {
      console.error('Failed to load profile:', error);
      setSaveError(getErrorMessage(error, 'Failed to load profile data'));
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityToggle = async (isPublic: boolean) => {
    setLoading(true);
    setSaveError(null);

    try {
      // TODO: Replace with actual API call
      // await fetch('/api/v1/candidates/profile/visibility', {
      //   method: 'PUT',
      //   body: JSON.stringify({ is_public: isPublic }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setProfile((prev) => ({ ...prev, isPublic }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, 'Failed to update visibility'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyChange = (settings: PrivacySettings) => {
    setProfile((prev) => ({ ...prev, privacySettings: settings }));
    setHasUnsavedChanges(true);
  };

  const handlePortfolioChange = (items: PortfolioItem[]) => {
    setProfile((prev) => ({ ...prev, portfolioItems: items }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setSaveError(null);

    try {
      // TODO: Replace with actual API call
      // await fetch('/api/v1/candidates/profile', {
      //   method: 'PUT',
      //   body: JSON.stringify({
      //     privacy_settings: profile.privacySettings,
      //     portfolio_items: profile.portfolioItems,
      //   }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, 'Failed to save changes'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4" data-testid="profile-settings-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Profile Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Control your profile visibility, privacy, and showcase your work
        </p>
      </div>

      {/* Save Success Message */}
      {saveSuccess && (
        <Alert className="mb-6" data-testid="save-success-message">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Changes saved successfully!</span> Your profile has been
            updated.
          </AlertDescription>
        </Alert>
      )}

      {/* Save Error Message */}
      {saveError && (
        <Alert variant="destructive" className="mb-6" data-testid="save-error-message">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Profile Visibility Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Visibility</CardTitle>
            <CardDescription>
              Control whether employers can discover your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileVisibilityToggle
              isPublic={profile.isPublic}
              completenessPercentage={profile.completenessPercentage}
              missingRequiredFields={profile.missingRequiredFields}
              onToggle={handleVisibilityToggle}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {/* Profile Completeness Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Completeness</CardTitle>
            <CardDescription>
              Complete your profile to increase visibility and attract better opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileCompletenessMeter
              percentage={profile.completenessPercentage}
              missingFields={profile.missingRequiredFields}
              isComplete={profile.completenessPercentage === 100}
            />
          </CardContent>
        </Card>

        {/* Privacy Controls Section */}
        {profile.isPublic && (
          <Card>
            <CardHeader>
              <CardTitle>Privacy Controls</CardTitle>
              <CardDescription>
                Choose what information employers can see on your public profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfilePrivacyControls
                settings={profile.privacySettings}
                onChange={handlePrivacyChange}
                disabled={loading}
              />
            </CardContent>
          </Card>
        )}

        {/* Portfolio Section */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
            <CardDescription>
              Showcase your projects, code repositories, and articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioManagement
              items={profile.portfolioItems}
              onChange={handlePortfolioChange}
              disabled={loading}
              maxItems={10}
            />
          </CardContent>
        </Card>

        {/* Profile Preview Link */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Preview Your Public Profile
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  See how employers will view your profile
                </p>
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-300">
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Save Bar */}
      {hasUnsavedChanges && (
        <div
          className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg"
          data-testid="unsaved-changes-bar"
        >
          <div className="container max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium">You have unsaved changes</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  loadProfileData();
                  setHasUnsavedChanges(false);
                }}
                disabled={loading}
              >
                Discard
              </Button>
              <Button onClick={handleSaveChanges} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
