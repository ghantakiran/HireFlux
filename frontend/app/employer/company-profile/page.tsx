'use client';

/**
 * Company Profile Setup Page (Issue #113)
 *
 * Employer-facing company profile management
 * - Company information form
 * - Logo upload with preview
 * - Culture & benefits
 * - Office locations (multiple with headquarters designation)
 * - Social media links
 * - Profile completion progress
 * - Public/private toggle
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Upload,
  X,
  Check,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Eye,
  Lock,
  Unlock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { toast } from 'sonner';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface CompanyProfile {
  name: string;
  industry: string;
  size: string;
  website: string;
  description: string;
  values: string;
  culture: string;
  logo: string | null;
  benefits: string[];
  locations: OfficeLocation[];
  socialMedia: SocialMedia;
  isPublic: boolean;
}

interface OfficeLocation {
  id: string;
  address: string;
  type: 'Headquarters' | 'Office';
}

interface SocialMedia {
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
}

interface ValidationErrors {
  [key: string]: string;
}

// ============================================================================
// Constants
// ============================================================================

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Other',
];

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1001-5000 employees',
  '5001+ employees',
];

const DESCRIPTION_MAX_LENGTH = 500;
const MAX_BENEFITS = 15;
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const AUTO_SAVE_DELAY = 2000; // 2 seconds

// ============================================================================
// Main Component
// ============================================================================

export default function CompanyProfileSetupPage() {
  const router = useRouter();

  // State
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '',
    industry: '',
    size: '',
    website: '',
    description: '',
    values: '',
    culture: '',
    logo: null,
    benefits: [],
    locations: [],
    socialMedia: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: '',
    },
    isPublic: true,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showLogoConfirm, setShowLogoConfirm] = useState(false);
  const [newBenefit, setNewBenefit] = useState('');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState({ address: '', type: 'Office' as 'Headquarters' | 'Office' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<'logo' | 'location' | null>(null);
  const [industrySearch, setIndustrySearch] = useState('');
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [saveIndicator, setSaveIndicator] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [draggedBenefitIndex, setDraggedBenefitIndex] = useState<number | null>(null);

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('company-profile-draft');
    if (draft) {
      setProfile(JSON.parse(draft));
      setIsDraft(true);
    }
  }, []);

  // Auto-save
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      autoSaveTimer.current = setTimeout(() => {
        handleAutoSave();
      }, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [profile, hasUnsavedChanges]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Check for duplicate company name
  useEffect(() => {
    if (profile.name.length > 0) {
      // Simulate duplicate check (would be API call)
      const knownCompanies = ['Existing Company Inc', 'Another Corp'];
      setDuplicateWarning(knownCompanies.includes(profile.name));
    }
  }, [profile.name]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleAutoSave = () => {
    localStorage.setItem('company-profile-draft', JSON.stringify(profile));
    setSaveIndicator('Saved');
    setHasUnsavedChanges(false);
    setTimeout(() => setSaveIndicator(''), 2000);
  };

  const handleInputChange = (field: keyof CompanyProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSocialMediaChange = (platform: keyof SocialMedia, value: string) => {
    setProfile((prev) => ({
      ...prev,
      socialMedia: { ...prev.socialMedia, [platform]: value },
    }));
    setHasUnsavedChanges(true);
  };

  const validateWebsite = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateSocialMedia = (platform: string, url: string): boolean => {
    if (!url) return true; // Optional field
    if (!validateWebsite(url)) return false;

    const platformDomains: Record<string, string> = {
      linkedin: 'linkedin.com',
      twitter: 'twitter.com',
      facebook: 'facebook.com',
      instagram: 'instagram.com',
    };

    return url.includes(platformDomains[platform]);
  };

  const handleWebsiteBlur = () => {
    if (profile.website && !validateWebsite(profile.website)) {
      setErrors((prev) => ({ ...prev, website: 'Please enter a valid URL' }));
    }
  };

  const handleSocialMediaBlur = (platform: keyof SocialMedia) => {
    const url = profile.socialMedia[platform];
    if (url && !validateSocialMedia(platform, url)) {
      setErrors((prev) => ({
        ...prev,
        [platform]: `Please enter a valid ${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`,
      }));
    } else {
      setErrors((prev) => ({ ...prev, [platform]: '' }));
    }
  };

  // Logo handlers
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      setErrors((prev) => ({ ...prev, logo: 'File size must be less than 5MB' }));
      return;
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, logo: 'Only PNG, JPG, and JPEG files are allowed' }));
      return;
    }

    setLogoFile(file);
    setErrors((prev) => ({ ...prev, logo: '' }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      setShowLogoConfirm(true);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUploadConfirm = () => {
    if (logoPreview) {
      setProfile((prev) => ({ ...prev, logo: logoPreview }));
      setShowLogoConfirm(false);
      setSuccessMessage(profile.logo ? 'Logo updated successfully' : 'Logo uploaded successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setHasUnsavedChanges(true);
    }
  };

  const handleLogoUploadCancel = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setShowLogoConfirm(false);
  };

  const handleLogoRemove = () => {
    setShowDeleteConfirm('logo');
    setConfirmType('logo');
  };

  const confirmLogoRemove = () => {
    setProfile((prev) => ({ ...prev, logo: null }));
    setLogoPreview(null);
    setLogoFile(null);
    setShowDeleteConfirm(null);
    setConfirmType(null);
    setHasUnsavedChanges(true);
  };

  // Benefits handlers
  const handleAddBenefit = () => {
    if (newBenefit.trim() && profile.benefits.length < MAX_BENEFITS) {
      setProfile((prev) => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()],
      }));
      setNewBenefit('');
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
    setHasUnsavedChanges(true);
  };

  const handleBenefitDragStart = (index: number) => {
    setDraggedBenefitIndex(index);
  };

  const handleBenefitDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedBenefitIndex === null || draggedBenefitIndex === index) return;

    const newBenefits = [...profile.benefits];
    const draggedItem = newBenefits[draggedBenefitIndex];
    newBenefits.splice(draggedBenefitIndex, 1);
    newBenefits.splice(index, 0, draggedItem);

    setProfile((prev) => ({ ...prev, benefits: newBenefits }));
    setDraggedBenefitIndex(index);
  };

  const handleBenefitDragEnd = () => {
    setDraggedBenefitIndex(null);
    setHasUnsavedChanges(true);
  };

  // Location handlers
  const handleAddLocation = () => {
    if (!newLocation.address) {
      setErrors((prev) => ({ ...prev, locationAddress: 'Please enter a complete address' }));
      return;
    }

    // Check address format (simple validation)
    const addressParts = newLocation.address.split(',');
    if (addressParts.length < 3) {
      setErrors((prev) => ({ ...prev, locationAddress: 'Please enter a complete address' }));
      return;
    }

    const location: OfficeLocation = {
      id: Date.now().toString(),
      address: newLocation.address,
      type: newLocation.type,
    };

    // If setting as headquarters, change existing HQ to Office
    let updatedLocations = [...profile.locations];
    if (newLocation.type === 'Headquarters') {
      updatedLocations = updatedLocations.map((loc) => ({ ...loc, type: 'Office' as 'Office' }));
    }

    if (editingLocationId) {
      updatedLocations = updatedLocations.map((loc) =>
        loc.id === editingLocationId ? { ...loc, ...location, id: editingLocationId } : loc
      );
      setEditingLocationId(null);
    } else {
      updatedLocations.push(location);
    }

    setProfile((prev) => ({ ...prev, locations: updatedLocations }));
    setNewLocation({ address: '', type: 'Office' });
    setErrors((prev) => ({ ...prev, locationAddress: '' }));
    setHasUnsavedChanges(true);
  };

  const handleEditLocation = (id: string) => {
    const location = profile.locations.find((loc) => loc.id === id);
    if (location) {
      setNewLocation({ address: location.address, type: location.type });
      setEditingLocationId(id);
    }
  };

  const handleRemoveLocation = (id: string) => {
    setShowDeleteConfirm(id);
    setConfirmType('location');
  };

  const confirmLocationRemove = () => {
    if (showDeleteConfirm && confirmType === 'location') {
      setProfile((prev) => ({
        ...prev,
        locations: prev.locations.filter((loc) => loc.id !== showDeleteConfirm),
      }));
      setShowDeleteConfirm(null);
      setConfirmType(null);
      setHasUnsavedChanges(true);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: ValidationErrors = {};

    if (!profile.name) {
      newErrors.name = 'Company name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage('Profile saved successfully');
      setHasUnsavedChanges(false);
      localStorage.removeItem('company-profile-draft');
      setIsDraft(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      toast.success('Company profile updated');
    } catch (error) {
      setFormError('Failed to save profile. Please try again.');
      setTimeout(() => setFormError(''), 5000);
      toast.error('Failed to update company profile. Please try again.');
    }
  };

  // Privacy toggle
  const handlePrivacyToggle = () => {
    setProfile((prev) => ({ ...prev, isPublic: !prev.isPublic }));
    setHasUnsavedChanges(true);
  };

  // View public profile
  const handleViewPublicProfile = () => {
    const slug = profile.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    router.push(`/company/${slug}`);
  };

  // ============================================================================
  // Completion Progress Calculation
  // ============================================================================

  const calculateCompletion = (): number => {
    let completed = 0;
    const sections = 5;

    // Basic info (20%)
    if (profile.name && profile.industry && profile.size && profile.description) completed++;

    // Logo (20%)
    if (profile.logo) completed++;

    // Culture & Benefits (20%)
    if (profile.values || profile.culture || profile.benefits.length > 0) completed++;

    // Locations (20%)
    if (profile.locations.length > 0) completed++;

    // Social media (20%)
    if (
      profile.socialMedia.linkedin ||
      profile.socialMedia.twitter ||
      profile.socialMedia.facebook ||
      profile.socialMedia.instagram
    )
      completed++;

    return Math.round((completed / sections) * 100);
  };

  const completionPercentage = calculateCompletion();

  const getSectionStatus = (section: string): boolean => {
    switch (section) {
      case 'Basic Information':
        return !!(profile.name && profile.industry && profile.size && profile.description);
      case 'Logo':
        return !!profile.logo;
      case 'Culture & Benefits':
        return !!(profile.values || profile.culture || profile.benefits.length > 0);
      case 'Office Locations':
        return profile.locations.length > 0;
      case 'Social Media':
        return !!(
          profile.socialMedia.linkedin ||
          profile.socialMedia.twitter ||
          profile.socialMedia.facebook ||
          profile.socialMedia.instagram
        );
      default:
        return false;
    }
  };

  // ============================================================================
  // Filtered Industries
  // ============================================================================

  const filteredIndustries = INDUSTRIES.filter((industry) =>
    industry.toLowerCase().includes(industrySearch.toLowerCase())
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div data-company-profile-page className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Company Profile</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">Manage your company information and public profile</p>
            </div>
            <button
              data-view-public-profile-button
              onClick={handleViewPublicProfile}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Eye className="w-4 h-4" />
              View Public Profile
            </button>
          </div>

          {/* Completion Progress */}
          <div data-completion-indicator className="mt-6 bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold">Profile Completion</span>
              </div>
              <span data-completion-percentage className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Section Status */}
            <div data-section-status-list className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Basic Information', 'Logo', 'Culture & Benefits', 'Office Locations', 'Social Media'].map((section) => (
                <div key={section} className="flex items-center gap-2">
                  {getSectionStatus(section) ? (
                    <Check data-section-complete className="w-4 h-4 text-green-500" />
                  ) : (
                    <div data-section-incomplete className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                  <span className={`text-sm ${getSectionStatus(section) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {section}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Message */}
          {isDraft && (
            <div data-draft-message className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-300">Continue editing your profile</p>
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div data-success-message className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Form Error */}
        {formError && (
          <div data-form-error className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-800 dark:text-red-300">{formError}</p>
            <button
              data-retry-button
              onClick={handleSubmit}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Auto-save Indicator */}
        {saveIndicator && (
          <div data-save-indicator className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {saveIndicator}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div data-basic-info-section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Name *
                </label>
                <input
                  id="company-name"
                  data-company-name-input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.name && (
                  <p data-company-name-error className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.name}
                  </p>
                )}
                {duplicateWarning && (
                  <div data-duplicate-warning className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">A company with this name already exists. Is this you?</p>
                    <button
                      data-claim-profile-button
                      type="button"
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                    >
                      Claim existing profile
                    </button>
                  </div>
                )}
              </div>

              {/* Industry */}
              <div className="relative">
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry *
                </label>
                <div className="relative">
                  <button
                    id="industry"
                    data-industry-select
                    type="button"
                    onClick={() => setShowIndustryDropdown(!showIndustryDropdown)}
                    aria-label="Select industry"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {profile.industry || 'Select industry'}
                  </button>
                  {showIndustryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      <input
                        data-industry-search
                        type="text"
                        placeholder="Search..."
                        value={industrySearch}
                        onChange={(e) => setIndustrySearch(e.target.value)}
                        className="w-full px-4 py-2 border-b border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                      <div className="max-h-60 overflow-y-auto">
                        {filteredIndustries.map((industry) => (
                          <button
                            key={industry}
                            data-industry-option={industry}
                            type="button"
                            onClick={() => {
                              handleInputChange('industry', industry);
                              setShowIndustryDropdown(false);
                              setIndustrySearch('');
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            {industry}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Size */}
              <div className="relative">
                <label htmlFor="company-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Size *
                </label>
                <div className="relative">
                  <button
                    id="company-size"
                    data-company-size-select
                    type="button"
                    onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                    aria-label="Select company size"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {profile.size || 'Select company size'}
                  </button>
                  {showSizeDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {COMPANY_SIZES.map((size) => (
                        <button
                          key={size}
                          data-size-option={size}
                          type="button"
                          onClick={() => {
                            handleInputChange('size', size);
                            setShowSizeDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Website
                </label>
                <input
                  id="website"
                  data-website-input
                  type="text"
                  value={profile.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  onBlur={handleWebsiteBlur}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.website && (
                  <p data-website-error className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.website}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Description
                </label>
                <textarea
                  id="description"
                  data-description-textarea
                  rows={4}
                  value={profile.description}
                  onChange={(e) => {
                    if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                      handleInputChange('description', e.target.value);
                    }
                  }}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                <div className="flex items-center justify-between mt-1">
                  <span data-description-count className="text-sm text-gray-600 dark:text-gray-400">
                    {profile.description.length}/{DESCRIPTION_MAX_LENGTH}
                  </span>
                  {profile.description.length >= DESCRIPTION_MAX_LENGTH - 20 && (
                    <span data-description-warning className="text-sm text-orange-600 dark:text-orange-400">
                      {DESCRIPTION_MAX_LENGTH - profile.description.length} characters remaining
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Logo Section */}
          <div data-logo-section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Company Logo</h2>

            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Logo Preview or Placeholder */}
              <div className="flex-shrink-0">
                {profile.logo ? (
                  <div className="relative w-32 h-32">
                    <OptimizedImage
                      data-logo-preview
                      src={profile.logo}
                      alt="Company logo"
                      width={128}
                      height={128}
                      className="rounded-lg border border-gray-200 dark:border-gray-700"
                      objectFit="cover"
                    />
                    <button
                      data-logo-remove-button
                      type="button"
                      onClick={handleLogoRemove}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    data-logo-placeholder
                    className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-950"
                  >
                    <Building2 className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Area */}
              <div className="flex-1">
                <button
                  data-logo-upload-area
                  type="button"
                  onClick={handleLogoClick}
                  className="w-full px-6 py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload logo</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 5MB</p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                {errors.logo && (
                  <div data-logo-error className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.logo}
                    <button
                      data-retry-upload-button
                      type="button"
                      onClick={handleLogoClick}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Logo Preview Confirmation */}
            {showLogoConfirm && logoPreview && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
                <p className="text-sm font-medium mb-2">Preview your logo:</p>
                <div className="relative w-24 h-24 mb-3">
                  <OptimizedImage
                    src={logoPreview}
                    alt="Logo preview"
                    width={96}
                    height={96}
                    className="rounded-lg"
                    objectFit="cover"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    data-logo-upload-confirm
                    type="button"
                    onClick={handleLogoUploadConfirm}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Upload
                  </button>
                  <button
                    data-logo-upload-cancel
                    type="button"
                    onClick={handleLogoUploadCancel}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {successMessage.includes('Logo') && (
              <p data-logo-success-message className="mt-2 text-sm text-green-600 dark:text-green-400">
                {successMessage}
              </p>
            )}
          </div>

          {/* Culture & Benefits Section */}
          <div data-culture-section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Culture & Benefits</h2>

            <div className="space-y-4">
              {/* Company Values */}
              <div>
                <label htmlFor="values" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Values
                </label>
                <input
                  id="values"
                  data-values-input
                  type="text"
                  value={profile.values}
                  onChange={(e) => handleInputChange('values', e.target.value)}
                  placeholder="e.g., Innovation, Collaboration, Growth"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Company Culture */}
              <div>
                <label htmlFor="culture" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Culture
                </label>
                <textarea
                  id="culture"
                  data-culture-textarea
                  rows={3}
                  value={profile.culture}
                  onChange={(e) => handleInputChange('culture', e.target.value)}
                  placeholder="Describe your company culture..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Benefits</label>

                {/* Benefits List */}
                {profile.benefits.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {profile.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        data-benefit-item
                        draggable
                        onDragStart={() => handleBenefitDragStart(index)}
                        onDragOver={(e) => handleBenefitDragOver(e, index)}
                        onDragEnd={handleBenefitDragEnd}
                        className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg cursor-move hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="flex-1">{benefit}</span>
                        <button
                          data-benefit-remove-button
                          type="button"
                          onClick={() => handleRemoveBenefit(index)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Benefit */}
                <div className="flex gap-2">
                  <input
                    data-benefit-input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                    placeholder="Enter a benefit"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                    disabled={profile.benefits.length >= MAX_BENEFITS}
                  />
                  <button
                    data-add-benefit-button
                    type="button"
                    onClick={handleAddBenefit}
                    disabled={profile.benefits.length >= MAX_BENEFITS || !newBenefit.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Benefit
                  </button>
                </div>

                {profile.benefits.length >= MAX_BENEFITS && (
                  <p data-benefits-limit-message className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                    Maximum 15 benefits allowed
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Office Locations Section */}
          <div data-locations-section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Office Locations</h2>

            {/* Locations List */}
            {profile.locations.length > 0 && (
              <div data-locations-list className="space-y-3 mb-4">
                {profile.locations.map((location) => (
                  <div key={location.id} data-location-item className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{location.address}</p>
                        {location.type === 'Headquarters' && (
                          <span data-location-badge className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                            Headquarters
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        data-location-edit-button
                        type="button"
                        onClick={() => handleEditLocation(location.id)}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        data-location-remove-button
                        type="button"
                        onClick={() => handleRemoveLocation(location.id)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Location Form */}
            <div data-location-form className="space-y-3 p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <div>
                <label htmlFor="location-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  id="location-address"
                  data-location-address-input
                  type="text"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  placeholder="123 Main St, City, State ZIP"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.locationAddress && (
                  <p data-location-address-error className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.locationAddress}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    data-location-type-headquarters
                    type="radio"
                    checked={newLocation.type === 'Headquarters'}
                    onChange={() => setNewLocation({ ...newLocation, type: 'Headquarters' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Headquarters</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={newLocation.type === 'Office'}
                    onChange={() => setNewLocation({ ...newLocation, type: 'Office' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Office</span>
                </label>
              </div>

              <button
                data-save-location-button
                type="button"
                onClick={handleAddLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {editingLocationId ? 'Save Location' : 'Add Location'}
              </button>
            </div>

            <button
              data-add-location-button
              type="button"
              onClick={() => {
                setNewLocation({ address: '', type: 'Office' });
                setEditingLocationId(null);
              }}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              + Add another location
            </button>
          </div>

          {/* Social Media Section */}
          <div data-social-section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Social Media</h2>

            <div className="space-y-4">
              {/* LinkedIn */}
              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </div>
                </label>
                <input
                  id="linkedin"
                  data-linkedin-input
                  type="text"
                  value={profile.socialMedia.linkedin}
                  onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                  onBlur={() => handleSocialMediaBlur('linkedin')}
                  placeholder="https://linkedin.com/company/yourcompany"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.linkedin && (
                  <p data-linkedin-error className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.linkedin}
                  </p>
                )}
              </div>

              {/* Twitter */}
              <div>
                <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </div>
                </label>
                <input
                  id="twitter"
                  data-twitter-input
                  type="text"
                  value={profile.socialMedia.twitter}
                  onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                  onBlur={() => handleSocialMediaBlur('twitter')}
                  placeholder="https://twitter.com/yourcompany"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.twitter && (
                  <p data-twitter-error className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.twitter}
                  </p>
                )}
              </div>

              {/* Facebook */}
              <div>
                <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </div>
                </label>
                <input
                  id="facebook"
                  data-facebook-input
                  type="text"
                  value={profile.socialMedia.facebook}
                  onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                  onBlur={() => handleSocialMediaBlur('facebook')}
                  placeholder="https://facebook.com/yourcompany"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.facebook && (
                  <p data-facebook-error className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.facebook}
                  </p>
                )}
              </div>

              {/* Instagram */}
              <div>
                <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </div>
                </label>
                <input
                  id="instagram"
                  data-instagram-input
                  type="text"
                  value={profile.socialMedia.instagram}
                  onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  onBlur={() => handleSocialMediaBlur('instagram')}
                  placeholder="https://instagram.com/yourcompany"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                {errors.instagram && (
                  <p data-instagram-error className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.instagram}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Controls */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Privacy Settings</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Public Profile</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Allow job seekers to view your company profile</p>
              </div>
              <button
                data-privacy-toggle
                type="button"
                onClick={handlePrivacyToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  profile.isPublic ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    profile.isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {profile.isPublic ? (
              <p data-privacy-message className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                Your profile is now public
              </p>
            ) : (
              <p data-privacy-message className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Your profile is private and not visible to job seekers
              </p>
            )}
          </div>

          {/* Form Errors */}
          {Object.keys(errors).length > 0 && errors.name && (
            <div data-form-errors className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300">Please fix the errors above to continue</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <button
              data-save-button
              type="submit"
              className="w-full sm:w-auto flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Save Profile
            </button>
            <button
              data-nav-dashboard
              type="button"
              onClick={() => router.push('/employer/dashboard')}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showDeleteConfirm && (
        <div data-confirm-dialog className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <p data-confirm-message className="text-lg mb-4">
              {confirmType === 'logo'
                ? 'Are you sure you want to remove the logo?'
                : 'Are you sure you want to remove this location?'}
            </p>
            <div className="flex gap-3">
              <button
                data-confirm-yes
                onClick={confirmType === 'logo' ? confirmLogoRemove : confirmLocationRemove}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Yes, Remove
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setConfirmType(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Completion Prompt (when under 50%) */}
      {completionPercentage < 50 && (
        <div
          data-profile-completion-prompt
          className="fixed bottom-4 right-4 left-4 sm:left-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700"
        >
          <p className="font-medium mb-2">Complete your company profile to attract better candidates</p>
          <a
            data-complete-profile-link
            href="/employer/company-profile"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
          >
            Complete your profile →
          </a>
        </div>
      )}
    </div>
  );
}
