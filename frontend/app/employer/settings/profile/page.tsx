/**
 * Company Profile Settings Page - Sprint 19-20 Week 39 Day 4 - Issue #21
 *
 * Main settings page for company profile management including:
 * - Basic company information (name, industry, size, location, website)
 * - Company logo upload/delete with preview
 * - Rich text description editor
 * - Social links (LinkedIn, Twitter)
 * - Timezone settings
 * - Notification preferences (email & in-app)
 * - Default job template
 *
 * Following TDD/BDD approach - implements scenarios from:
 * frontend/tests/features/company-profile-settings.feature
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Globe,
  Linkedin,
  Twitter,
  Bell,
  Clock,
  FileText,
  Upload,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { CompanyLogoUpload } from '@/components/employer/CompanyLogoUpload';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/employer/RichTextEditor';
import { NotificationSettings } from '@/components/employer/NotificationSettings';
import { employerSettingsSchema } from '@/lib/validations/company';
import { getAuthToken } from '@/lib/api-client';

// Types
interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  logo_url?: string;
  description?: string;
  linkedin_url?: string;
  twitter_url?: string;
  timezone?: string;
  notification_settings?: {
    email: {
      new_application: boolean;
      stage_change: boolean;
      team_mention: boolean;
      weekly_digest: boolean;
    };
    in_app: {
      new_application: boolean;
      team_activity: boolean;
      stage_change: boolean;
      weekly_digest: boolean;
    };
  };
  default_job_template_id?: string;
}

interface FormErrors {
  name?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  description?: string;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Real Estate',
  'Hospitality',
  'Transportation',
  'Media',
  'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501+'];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
];

export default function CompanyProfileSettingsPage() {
  // State
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('identity');

  // Set page metadata
  useEffect(() => {
    document.title = 'Settings | HireFlux';
  }, []);

  // Fetch company data on mount
  useEffect(() => {
    fetchCompanyData();
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (company && formData && Object.keys(formData).length > 0) {
      const hasChanges = Object.keys(formData).some(
        (key) => formData[key as keyof Company] !== company[key as keyof Company]
      );
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, company]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchCompanyData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/employers/me', {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company data');
      }

      const result = await response.json();
      const companyData = result.success ? result.data.company : result.data;

      setCompany(companyData);
      setFormData(companyData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load company data'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const result = employerSettingsSchema.safeParse({
      name: formData.name,
      website: formData.website || '',
      description: formData.description || '',
      linkedin_url: formData.linkedin_url || '',
      twitter_url: formData.twitter_url || '',
      industry: formData.industry,
      size: formData.size,
      location: formData.location || '',
      timezone: formData.timezone,
    });

    if (!result.success) {
      const newErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        newErrors[field as keyof FormErrors] = issue.message;
      }
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setErrorMessage('Please fix the errors before saving');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/v1/employers/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update company profile');
      }

      const result = await response.json();
      const updatedCompany = result.success ? result.data.company : result.data;

      setCompany(updatedCompany);
      setFormData(updatedCompany);
      setHasUnsavedChanges(false);
      setSuccessMessage('Profile updated successfully');
      toast.success('Settings saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Company, value: Company[keyof Company]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLogoUpload = (logoUrl: string) => {
    setCompany((prev) => (prev ? { ...prev, logo_url: logoUrl } : null));
    setSuccessMessage('Logo uploaded successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogoDelete = () => {
    setCompany((prev) => (prev ? { ...prev, logo_url: undefined } : null));
    setSuccessMessage('Logo deleted successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  if (isLoading) {
    return <PageLoader message="Loading company settings..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Company Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your company profile, logo, and preferences
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <Alert className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
              You have unsaved changes. Remember to save before leaving.
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="identity" className="gap-2">
              <Building2 className="h-4 w-4" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Globe className="h-4 w-4" />
              Social Links
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Bell className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Identity</CardTitle>
                <CardDescription>
                  Basic information and branding for your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company Logo */}
                <div>
                  <Label>Company Logo</Label>
                  <CompanyLogoUpload
                    currentLogoUrl={company?.logo_url}
                    onUpload={handleLogoUpload}
                    onDelete={handleLogoDelete}
                  />
                </div>

                {/* Company Name */}
                <div>
                  <Label htmlFor="company-name">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company-name"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Acme Corporation"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Website */}
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                    className={errors.website ? 'border-red-500' : ''}
                  />
                  {errors.website && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.website}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>
                  Detailed information about your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Industry */}
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => handleInputChange('industry', value)}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Size */}
                <div>
                  <Label htmlFor="company-size">Company Size</Label>
                  <Select
                    value={formData.size}
                    onValueChange={(value) => handleInputChange('size', value)}
                  >
                    <SelectTrigger id="company-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size} employees
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="San Francisco, CA or Remote"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Enter city/state or "Remote" for remote-first companies
                  </p>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Company Description</Label>
                  <RichTextEditor
                    value={formData.description || ''}
                    onChange={(value) => handleInputChange('description', value)}
                    maxLength={5000}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Links Tab */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
                <CardDescription>
                  Connect your company's social media profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* LinkedIn */}
                <div>
                  <Label htmlFor="linkedin-url">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn Company Page
                    </div>
                  </Label>
                  <Input
                    id="linkedin-url"
                    type="url"
                    value={formData.linkedin_url || ''}
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/company/your-company"
                    className={errors.linkedin_url ? 'border-red-500' : ''}
                  />
                  {errors.linkedin_url && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.linkedin_url}</p>
                  )}
                </div>

                {/* Twitter */}
                <div>
                  <Label htmlFor="twitter-url">
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter/X Profile
                    </div>
                  </Label>
                  <Input
                    id="twitter-url"
                    type="url"
                    value={formData.twitter_url || ''}
                    onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                    placeholder="https://twitter.com/yourcompany"
                    className={errors.twitter_url ? 'border-red-500' : ''}
                  />
                  {errors.twitter_url && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.twitter_url}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Timezone */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timezone
                  </div>
                </CardTitle>
                <CardDescription>
                  Set your company's timezone for scheduling and timestamps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.timezone || 'UTC'}
                  onValueChange={(value) => handleInputChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </div>
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about important events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationSettings
                  settings={formData.notification_settings}
                  onChange={(settings) =>
                    handleInputChange('notification_settings', settings)
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button (Sticky Footer) */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-4 mt-8 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              {hasUnsavedChanges && (
                <span className="text-sm text-gray-600 dark:text-gray-400">You have unsaved changes</span>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
