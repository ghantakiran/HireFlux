/**
 * Feedback Widget Component
 * Main feedback widget that displays different forms based on user selection
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Bug, Lightbulb, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BugReportForm, BugReportData } from './bug-report-form';
import { FeatureRequestForm, FeatureRequestData } from './feature-request-form';
import { GeneralFeedbackForm, GeneralFeedbackData } from './general-feedback-form';
import { toast } from 'sonner';

type FeedbackType = 'bug' | 'feature' | 'general' | null;

export interface FeedbackWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  errorContext?: {
    errorId: string;
    message: string;
    url: string;
  };
}

export function FeedbackWidget({ isOpen, onClose, errorContext }: FeedbackWidgetProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType>(null);
  const [trackingId, setTrackingId] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-select bug report if there's error context
  useEffect(() => {
    if (isOpen && errorContext && !selectedType) {
      setSelectedType('bug');
    }
  }, [isOpen, errorContext, selectedType]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedType(null);
        setTrackingId('');
        setShowSuccess(false);
      }, 300); // Wait for close animation
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleBack = () => {
    setSelectedType(null);
    setShowSuccess(false);
  };

  const handleBugReportSubmit = async (data: BugReportData) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('stepsToReproduce', data.stepsToReproduce);
      formData.append('expectedBehavior', data.expectedBehavior);
      formData.append('actualBehavior', data.actualBehavior);
      formData.append('severity', data.severity);
      formData.append('url', data.url);
      formData.append('userAgent', data.userAgent);
      if (data.errorId) formData.append('errorId', data.errorId);
      if (data.screenshot) formData.append('screenshot', data.screenshot);

      const response = await fetch('/api/v1/feedback/bug-report', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit bug report');
      }

      const result = await response.json();
      setTrackingId(result.tracking_id || result.data?.tracking_id || 'BUG-UNKNOWN');
      setShowSuccess(true);
      toast.success('Bug report submitted successfully!');
    } catch (error) {
      console.error('Bug report submission failed:', error);
      toast.error('Failed to submit bug report. Please try again.');
      throw error;
    }
  };

  const handleFeatureRequestSubmit = async (data: FeatureRequestData) => {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('useCase', data.useCase);
      formData.append('priority', data.priority);

      if (data.mockups) {
        data.mockups.forEach((file, index) => {
          formData.append(`mockup_${index}`, file);
        });
      }

      const response = await fetch('/api/v1/feedback/feature-request', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit feature request');
      }

      const result = await response.json();
      setTrackingId(result.tracking_id || result.data?.tracking_id || 'FEAT-UNKNOWN');
      setShowSuccess(true);
      toast.success('Feature request submitted successfully!');
    } catch (error) {
      console.error('Feature request submission failed:', error);
      toast.error('Failed to submit feature request. Please try again.');
      throw error;
    }
  };

  const handleGeneralFeedbackSubmit = async (data: GeneralFeedbackData) => {
    try {
      const response = await fetch('/api/v1/feedback/general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      const result = await response.json();
      setShowSuccess(true);
      toast.success(result.message || 'Thank you for your feedback!');
    } catch (error) {
      console.error('Feedback submission failed:', error);
      toast.error('Failed to submit feedback. Please try again.');
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        data-testid="feedback-widget"
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          data-testid="feedback-widget-close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader>
          <DialogTitle>
            {showSuccess ? (
              'Feedback Submitted'
            ) : selectedType === 'bug' ? (
              'Report a Bug'
            ) : selectedType === 'feature' ? (
              'Request a Feature'
            ) : selectedType === 'general' ? (
              'Send Feedback'
            ) : (
              'How can we help?'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {showSuccess ? (
            <div className="text-center py-8" data-feedback-success aria-live="polite">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
              <p className="text-muted-foreground mb-4">
                {selectedType === 'bug'
                  ? 'Your bug report has been submitted. Our team will investigate and keep you updated.'
                  : selectedType === 'feature'
                  ? 'Your feature request has been submitted. We appreciate your suggestion!'
                  : 'Your feedback has been received. Thank you for helping us improve!'}
              </p>
              {trackingId && (
                <div className="bg-muted p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium">Tracking ID</p>
                  <p className="text-lg font-mono">{trackingId}</p>
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={handleBack} variant="outline">
                  Submit Another
                </Button>
                <Button onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : selectedType ? (
            <div>
              {selectedType === 'bug' && (
                <BugReportForm
                  onSubmit={handleBugReportSubmit}
                  onCancel={handleBack}
                  errorContext={errorContext}
                />
              )}
              {selectedType === 'feature' && (
                <FeatureRequestForm
                  onSubmit={handleFeatureRequestSubmit}
                  onCancel={handleBack}
                />
              )}
              {selectedType === 'general' && (
                <GeneralFeedbackForm
                  onSubmit={handleGeneralFeedbackSubmit}
                  onCancel={handleBack}
                />
              )}
            </div>
          ) : (
            <div className="grid gap-3" data-feedback-menu role="menu">
              <Button
                variant="outline"
                className="h-auto py-4 px-6 flex items-start justify-start text-left"
                onClick={() => setSelectedType('bug')}
                data-feedback-type="bug"
              >
                <Bug className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium">Report a Bug</p>
                  <p className="text-sm text-muted-foreground">
                    Something not working? Let us know so we can fix it.
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 px-6 flex items-start justify-start text-left"
                onClick={() => setSelectedType('feature')}
                data-feedback-type="feature"
              >
                <Lightbulb className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium">Request a Feature</p>
                  <p className="text-sm text-muted-foreground">
                    Have an idea? Share it with us and help shape the product.
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 px-6 flex items-start justify-start text-left"
                onClick={() => setSelectedType('general')}
                data-feedback-type="general"
              >
                <MessageCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium">Send Feedback</p>
                  <p className="text-sm text-muted-foreground">
                    Share your thoughts, suggestions, or compliments.
                  </p>
                </div>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
