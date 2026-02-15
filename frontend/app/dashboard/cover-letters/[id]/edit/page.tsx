'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Save,
  Loader2,
  Eye,
  Edit3,
  Download,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PageLoader } from '@/components/ui/page-loader';
import {
  useCoverLetterStore,
  type CoverLetterTone,
  type CoverLetterLength,
} from '@/lib/stores/cover-letter-store';

export default function EditCoverLetterPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    currentCoverLetter,
    isLoading,
    error,
    fetchCoverLetter,
    updateCoverLetter,
    clearError,
    clearCurrentCoverLetter,
  } = useCoverLetterStore();

  // Editor state
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Auto-save ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef(content);

  // Fetch cover letter on mount
  useEffect(() => {
    fetchCoverLetter(id);

    return () => {
      clearCurrentCoverLetter();
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [id]);

  // Initialize content when cover letter loads
  useEffect(() => {
    if (currentCoverLetter && !content) {
      setContent(currentCoverLetter.content);
      contentRef.current = currentCoverLetter.content;
    }
  }, [currentCoverLetter]);

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      autoSaveTimerRef.current = setInterval(() => {
        handleAutoSave();
      }, 30000); // 30 seconds

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [hasUnsavedChanges]);

  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Check if content is different from original
    if (currentCoverLetter && newContent !== currentCoverLetter.content) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  };

  const handleAutoSave = async () => {
    if (!hasUnsavedChanges || !currentCoverLetter) return;

    try {
      await updateCoverLetter(id, contentRef.current);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleManualSave = async () => {
    if (!currentCoverLetter) return;

    try {
      setIsSaving(true);
      clearError();
      await updateCoverLetter(id, content);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      // Error handled by store
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      router.push('/dashboard/cover-letters');
    }
  };

  const handleCancelConfirmed = () => {
    setShowCancelDialog(false);
    router.push('/dashboard/cover-letters');
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    alert('Download functionality coming soon!');
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      router.push(`/dashboard/cover-letters/${id}`);
    }
  };

  // Calculate word and character count
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const getToneBadge = (tone: CoverLetterTone) => {
    const configs = {
      formal: { label: 'Formal', className: 'bg-blue-100 text-blue-800' },
      concise: { label: 'Concise', className: 'bg-purple-100 text-purple-800' },
      conversational: {
        label: 'Conversational',
        className: 'bg-green-100 text-green-800',
      },
    };

    const config = configs[tone];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 120) return '1 minute ago';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    return date.toLocaleTimeString();
  };

  // Loading state
  if (isLoading && !currentCoverLetter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageLoader message="Loading cover letter..." />
      </div>
    );
  }

  // Error state
  if (!currentCoverLetter && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-lg font-medium text-red-700">Cover letter not found</p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              The cover letter you're looking for doesn't exist or has been deleted.
            </p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/cover-letters')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cover Letters
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit Cover Letter</h1>
            {currentCoverLetter && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  {currentCoverLetter.job_title || 'Cover Letter'}
                  {currentCoverLetter.company_name && ` at ${currentCoverLetter.company_name}`}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={hasUnsavedChanges}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <ErrorBanner error={error} onDismiss={clearError} />

      {/* Status Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              {/* Save Status */}
              <div className="flex items-center gap-2">
                {hasUnsavedChanges ? (
                  <>
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-700">Unsaved changes</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Last saved: {formatLastSaved(lastSaved)}
                    </span>
                  </>
                )}
              </div>

              {/* Word & Character Count */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>

              {/* Settings Badges */}
              {currentCoverLetter && (
                <div className="flex items-center gap-2">
                  {getToneBadge(currentCoverLetter.tone)}
                  <Badge variant="outline">
                    {currentCoverLetter.length === 'short'
                      ? 'Short'
                      : currentCoverLetter.length === 'medium'
                      ? 'Medium'
                      : 'Long'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Preview Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="preview-mode" className="text-sm">
                Preview
              </Label>
              <Switch
                id="preview-mode"
                checked={previewMode}
                onCheckedChange={setPreviewMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {previewMode ? (
              <>
                <Eye className="h-5 w-5" />
                <CardTitle>Preview</CardTitle>
              </>
            ) : (
              <>
                <Edit3 className="h-5 w-5" />
                <CardTitle>Edit Content</CardTitle>
              </>
            )}
          </div>
          <CardDescription>
            {previewMode
              ? 'Preview how your cover letter will appear'
              : 'Make changes to your cover letter content'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {previewMode ? (
            <div className="prose max-w-none min-h-[500px] p-6 bg-gray-50 rounded-md">
              <p className="whitespace-pre-wrap">{content}</p>
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Enter your cover letter content..."
              className="min-h-[500px] font-serif text-base leading-relaxed"
              disabled={isSaving}
            />
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Editing Tips</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Your changes are auto-saved every 30 seconds</li>
                <li>Use the preview toggle to see how your letter will appear</li>
                <li>Maintain a professional tone and check for typos</li>
                <li>Save manually before downloading or navigating away</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirmed} className="bg-red-600">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
