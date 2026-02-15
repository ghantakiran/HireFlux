'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { candidateProfileApi } from '@/lib/api';
import { candidateProfileSchema, portfolioItemSchema } from '@/lib/validations/candidate';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, Trash2, Plus, X, Github, Globe, FileText, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface PortfolioItem {
  type: 'github' | 'website' | 'article' | 'project';
  title: string;
  description?: string;
  url: string;
}

interface Profile {
  id: string;
  headline: string;
  bio?: string;
  location?: string;
  skills: string[];
  years_experience?: number;
  experience_level?: string;
  min_salary?: number;
  max_salary?: number;
  preferred_location_type?: string;
  open_to_remote?: boolean;
  availability_status?: string;
  available_from?: string;
  visibility: string;
  profile_picture_url?: string;
  preferred_roles?: string[];
  portfolio_items?: PortfolioItem[];
  profile_views?: number;
  invites_received?: number;
}

const SKILLS_OPTIONS = [
  'Python', 'React', 'TypeScript', 'JavaScript', 'Node.js', 'PostgreSQL', 'MongoDB',
  'AWS', 'Docker', 'Kubernetes', 'TensorFlow', 'PyTorch', 'FastAPI', 'Django', 'Go', 'Rust'
];

const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'lead', 'executive'];
const LOCATION_TYPES = ['remote', 'hybrid', 'onsite', 'any'];
const AVAILABILITY_STATUSES = ['actively_looking', 'open_to_offers', 'not_looking'];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [portfolioFormIndex, setPortfolioFormIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [profile, setProfile] = useState<Partial<Profile>>({
    headline: '',
    bio: '',
    location: '',
    skills: [],
    years_experience: undefined,
    experience_level: '',
    min_salary: undefined,
    max_salary: undefined,
    preferred_location_type: '',
    open_to_remote: false,
    availability_status: 'open_to_offers',
    visibility: 'private',
    portfolio_items: [],
    profile_views: 0,
    invites_received: 0,
  });

  // Portfolio form state
  const [portfolioForm, setPortfolioForm] = useState<PortfolioItem>({
    type: 'github',
    title: '',
    description: '',
    url: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await candidateProfileApi.getMyProfile();

      if (response.data.success) {
        setProfile(response.data.data);
        setHasProfile(true);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasProfile(false);
      } else {
        console.error('Failed to load profile:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod schema validation
    const result = candidateProfileSchema.safeParse({
      headline: profile.headline || '',
      bio: profile.bio || '',
      location: profile.location || '',
      skills: profile.skills || [],
      years_experience: profile.years_experience ?? null,
      experience_level: profile.experience_level || '',
      min_salary: profile.min_salary ?? null,
      max_salary: profile.max_salary ?? null,
      preferred_location_type: profile.preferred_location_type || '',
      open_to_remote: profile.open_to_remote || false,
      availability_status: profile.availability_status || '',
      available_from: profile.available_from || '',
      visibility: (profile.visibility as 'public' | 'private') || 'private',
    });

    if (!result.success) {
      const firstError = result.error.issues[0];
      setMessage({ type: 'error', text: firstError.message });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      if (hasProfile) {
        await candidateProfileApi.update(profile);
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        toast.success('Profile updated successfully');
      } else {
        await candidateProfileApi.create({
          headline: profile.headline || '',
          bio: profile.bio,
          location: profile.location,
          skills: profile.skills,
          years_experience: profile.years_experience,
          experience_level: profile.experience_level,
          min_salary: profile.min_salary,
          max_salary: profile.max_salary,
          preferred_location_type: profile.preferred_location_type,
          open_to_remote: profile.open_to_remote,
          availability_status: profile.availability_status,
          visibility: profile.visibility,
        });
        setMessage({ type: 'success', text: 'Profile created successfully' });
        toast.success('Profile created successfully');
        setHasProfile(true);
        await loadProfile();
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save profile'
      });
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilityToggle = async () => {
    const newVisibility = profile.visibility === 'public' ? 'private' : 'public';

    try {
      await candidateProfileApi.setVisibility(newVisibility as 'public' | 'private');
      setProfile({ ...profile, visibility: newVisibility });
      setShowVisibilityDialog(false);
      setMessage({
        type: 'success',
        text: `Profile is now ${newVisibility}`
      });
      toast.success(`Profile is now ${newVisibility}`);
    } catch (error: any) {
      console.error('Failed to update visibility:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update visibility'
      });
      toast.error('Failed to update visibility. Please try again.');
    }
  };

  const handleAvailabilityUpdate = async (status: string) => {
    try {
      await candidateProfileApi.updateAvailability({
        availability_status: status as any,
        available_from: profile.available_from,
      });
      setProfile({ ...profile, availability_status: status });
      setMessage({ type: 'success', text: 'Availability updated' });
      toast.success('Availability updated');
    } catch (error: any) {
      console.error('Failed to update availability:', error);
      setMessage({ type: 'error', text: 'Failed to update availability' });
      toast.error('Failed to update availability. Please try again.');
    }
  };

  const handleAddPortfolioItem = async () => {
    // Zod schema validation
    const result = portfolioItemSchema.safeParse({
      type: portfolioForm.type,
      title: portfolioForm.title,
      url: portfolioForm.url,
      description: portfolioForm.description || '',
    });

    if (!result.success) {
      const firstError = result.error.issues[0];
      setMessage({ type: 'error', text: firstError.message });
      return;
    }

    try {
      await candidateProfileApi.addPortfolioItem(portfolioForm);
      setMessage({ type: 'success', text: 'Portfolio item added' });
      toast.success('Portfolio item added');
      setShowPortfolioDialog(false);
      setPortfolioForm({ type: 'github', title: '', description: '', url: '' });
      await loadProfile();
    } catch (error: any) {
      console.error('Failed to add portfolio item:', error);
      setMessage({ type: 'error', text: 'Failed to add portfolio item' });
      toast.error('Failed to add portfolio item. Please try again.');
    }
  };

  const handleRemovePortfolioItem = async (index: number) => {
    try {
      await candidateProfileApi.removePortfolioItem(index);
      setMessage({ type: 'success', text: 'Portfolio item removed' });
      toast.success('Portfolio item removed');
      await loadProfile();
    } catch (error: any) {
      console.error('Failed to remove portfolio item:', error);
      setMessage({ type: 'error', text: 'Failed to remove portfolio item' });
      toast.error('Failed to remove portfolio item. Please try again.');
    }
  };

  const handleDeleteProfile = async () => {
    try {
      await candidateProfileApi.delete();
      setMessage({ type: 'success', text: 'Profile deleted' });
      toast.success('Profile deleted');
      setShowDeleteDialog(false);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to delete profile:', error);
      setMessage({ type: 'error', text: 'Failed to delete profile' });
      toast.error('Failed to delete profile. Please try again.');
    }
  };

  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case 'github': return <Github className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      case 'article': return <FileText className="h-4 w-4" />;
      case 'project': return <Briefcase className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Candidate Profile Settings</h1>
        <p className="text-muted-foreground">
          Create and manage your public profile to be discovered by employers
        </p>
      </div>

      {message && (
        <Card className={`mb-6 ${message.type === 'success' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
          <CardContent className="p-4">
            <p className={`text-sm ${message.type === 'success' ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your headline and bio for discovery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headline">Headline *</Label>
              <Input
                id="headline"
                value={profile.headline || ''}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                placeholder="e.g., Senior Full-Stack Engineer"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell employers about yourself..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="e.g., San Francisco, CA"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills and Experience */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Experience</CardTitle>
            <CardDescription>Your technical skills and experience level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="skills">Skills</Label>
              <TagInput
                id="skills"
                value={profile.skills || []}
                onChange={(skills) => setProfile({ ...profile, skills })}
                placeholder="Add skills..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="years_experience">Years of Experience</Label>
                <Input
                  id="years_experience"
                  type="number"
                  value={profile.years_experience || ''}
                  onChange={(e) => setProfile({ ...profile, years_experience: parseInt(e.target.value) || undefined })}
                  placeholder="8"
                />
              </div>

              <div>
                <Label htmlFor="experience_level">Experience Level</Label>
                <Select
                  value={profile.experience_level || ''}
                  onValueChange={(value) => setProfile({ ...profile, experience_level: value })}
                >
                  <SelectTrigger id="experience_level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Expectations */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Expectations</CardTitle>
            <CardDescription>Your desired salary range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_salary">Minimum Salary ($)</Label>
                <Input
                  id="min_salary"
                  type="number"
                  value={profile.min_salary || ''}
                  onChange={(e) => setProfile({ ...profile, min_salary: parseInt(e.target.value) || undefined })}
                  placeholder="150000"
                />
              </div>

              <div>
                <Label htmlFor="max_salary">Maximum Salary ($)</Label>
                <Input
                  id="max_salary"
                  type="number"
                  value={profile.max_salary || ''}
                  onChange={(e) => setProfile({ ...profile, max_salary: parseInt(e.target.value) || undefined })}
                  placeholder="180000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Location Preferences</CardTitle>
            <CardDescription>Your preferred work arrangement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="preferred_location_type">Preferred Location Type</Label>
              <Select
                value={profile.preferred_location_type || ''}
                onValueChange={(value) => setProfile({ ...profile, preferred_location_type: value })}
              >
                <SelectTrigger id="preferred_location_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="open_to_remote"
                checked={profile.open_to_remote || false}
                onChange={(e) => setProfile({ ...profile, open_to_remote: e.target.checked })}
              />
              <Label htmlFor="open_to_remote">Open to Remote</Label>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <CardDescription>Your current job search status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="availability_status">Availability Status</Label>
              <Select
                value={profile.availability_status || ''}
                onValueChange={handleAvailabilityUpdate}
              >
                <SelectTrigger id="availability_status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {profile.availability_status === 'actively_looking' && (
              <div>
                <Label htmlFor="available_from">Available From</Label>
                <Input
                  id="available_from"
                  type="date"
                  value={profile.available_from || ''}
                  onChange={(e) => setProfile({ ...profile, available_from: e.target.value })}
                />
              </div>
            )}

            {profile.availability_status === 'open_to_offers' && (
              <div data-testid="availability-badge">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Open to Offers</Badge>
              </div>
            )}

            {profile.availability_status === 'actively_looking' && (
              <p className="text-sm text-green-600 dark:text-green-400">Actively Looking</p>
            )}

            {profile.availability_status === 'not_looking' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Not Looking</p>
            )}
          </CardContent>
        </Card>

        {/* Portfolio */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Portfolio</CardTitle>
                <CardDescription>Showcase your work to employers</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPortfolioDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Portfolio Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {profile.portfolio_items && profile.portfolio_items.length > 0 ? (
              <div className="space-y-3">
                {profile.portfolio_items.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      {getPortfolioIcon(item.type)}
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.url}
                        </a>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPortfolioFormIndex(index);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No portfolio items yet. Add your projects to stand out!</p>
            )}
          </CardContent>
        </Card>

        {/* Visibility Control */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Visibility</CardTitle>
            <CardDescription>Control who can see your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Profile is {profile.visibility === 'public' ? 'Public' : 'Private'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile.visibility === 'public'
                    ? 'Visible to employers in search results'
                    : 'Not visible to employers - hidden from search'}
                </p>
              </div>
              <Button
                type="button"
                variant={profile.visibility === 'public' ? 'outline' : 'default'}
                onClick={() => setShowVisibilityDialog(true)}
              >
                {profile.visibility === 'public' ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Make Private
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Make Public
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics (if profile exists) */}
        {hasProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Analytics</CardTitle>
              <CardDescription>Track your profile performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Profile Views</p>
                  <p className="text-2xl font-bold" data-testid="profile-views-count">
                    {profile.profile_views || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invites Received</p>
                  <p className="text-2xl font-bold" data-testid="invites-count">
                    {profile.invites_received || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div>
            {hasProfile && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Profile
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {hasProfile ? 'Save Changes' : 'Create Profile'}
            </Button>
          </div>
        </div>
      </form>

      {/* Visibility Confirmation Dialog */}
      <Dialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Profile {profile.visibility === 'public' ? 'Private' : 'Public'}?</DialogTitle>
            <DialogDescription>
              {profile.visibility === 'public' ? (
                'Your profile will be hidden from employers and removed from search results. You can make it public again at any time.'
              ) : (
                'Your profile will be visible to all employers in search results. Employers will be able to view your information and invite you to opportunities.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVisibilityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVisibilityToggle}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portfolio Item Dialog */}
      <Dialog open={showPortfolioDialog} onOpenChange={setShowPortfolioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Portfolio Item</DialogTitle>
            <DialogDescription>
              Showcase your work, projects, or publications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="portfolio_type">Type</Label>
              <Select
                value={portfolioForm.type}
                onValueChange={(value: any) => setPortfolioForm({ ...portfolioForm, type: value })}
              >
                <SelectTrigger id="portfolio_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github">GitHub Repository</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="portfolio_title">Title</Label>
              <Input
                id="portfolio_title"
                value={portfolioForm.title}
                onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                placeholder="My Awesome Project"
              />
            </div>

            <div>
              <Label htmlFor="portfolio_description">Description</Label>
              <Textarea
                id="portfolio_description"
                value={portfolioForm.description}
                onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                placeholder="A brief description..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="portfolio_url">URL</Label>
              <Input
                id="portfolio_url"
                type="url"
                value={portfolioForm.url}
                onChange={(e) => setPortfolioForm({ ...portfolioForm, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPortfolioDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPortfolioItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your candidate profile and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={portfolioFormIndex !== null ? () => handleRemovePortfolioItem(portfolioFormIndex) : handleDeleteProfile}>
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
