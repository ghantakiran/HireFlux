/**
 * Status Change Modal Component - Issue #58
 *
 * Modal for changing application status with:
 * - Status dropdown (8 stages)
 * - Email notification toggle
 * - Custom message input
 * - Rejection reason dropdown
 * - Email preview
 * - Confirmation workflow
 *
 * Following BDD scenarios from:
 * tests/features/application-status-change.feature
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Eye, AlertCircle, Send } from 'lucide-react';

// Application status enum (matches backend ATSApplicationStatus)
export enum ApplicationStatus {
  NEW = 'new',
  REVIEWING = 'reviewing',
  PHONE_SCREEN = 'phone_screen',
  TECHNICAL_INTERVIEW = 'technical_interview',
  FINAL_INTERVIEW = 'final_interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

// Status display names
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: 'New',
  [ApplicationStatus.REVIEWING]: 'Reviewing',
  [ApplicationStatus.PHONE_SCREEN]: 'Phone Screen',
  [ApplicationStatus.TECHNICAL_INTERVIEW]: 'Technical Interview',
  [ApplicationStatus.FINAL_INTERVIEW]: 'Final Interview',
  [ApplicationStatus.OFFER]: 'Offer',
  [ApplicationStatus.HIRED]: 'Hired',
  [ApplicationStatus.REJECTED]: 'Rejected',
};

// Rejection reasons
const REJECTION_REASONS = [
  'Not enough experience with required technologies',
  'Looking for different skill set',
  'Position filled',
  'Salary expectations too high',
  'Location mismatch',
  'Not a cultural fit',
  'Failed technical assessment',
  'Other',
];

interface Application {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  status: ApplicationStatus;
}

interface StatusChangeModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: StatusChangeData) => Promise<void>;
}

export interface StatusChangeData {
  applicationId: string;
  newStatus: ApplicationStatus;
  sendEmail: boolean;
  customMessage?: string;
  rejectionReason?: string;
}

export default function StatusChangeModal({
  application,
  isOpen,
  onClose,
  onConfirm,
}: StatusChangeModalProps) {
  // State
  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>('');
  const [sendEmail, setSendEmail] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && application) {
      setNewStatus('');
      setSendEmail(true);
      setCustomMessage('');
      setRejectionReason('');
      setError(null);
      setValidationError(null);
      setShowEmailPreview(false);
    }
  }, [isOpen, application]);

  // Validate status transition
  useEffect(() => {
    if (!application || !newStatus) {
      setValidationError(null);
      return;
    }

    const currentStatus = application.status;

    // Cannot change rejected applications
    if (currentStatus === ApplicationStatus.REJECTED) {
      setValidationError('Cannot change status of rejected application');
      return;
    }

    // Cannot change hired applications
    if (currentStatus === ApplicationStatus.HIRED) {
      setValidationError('Cannot change status of hired application');
      return;
    }

    setValidationError(null);
  }, [application, newStatus]);

  // Handle status change confirmation
  const handleConfirm = async () => {
    if (!application || !newStatus) return;

    if (validationError) {
      return;
    }

    // Validate rejection reason if rejecting
    if (newStatus === ApplicationStatus.REJECTED && !rejectionReason) {
      setError('Please select a rejection reason');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm({
        applicationId: application.id,
        newStatus: newStatus as ApplicationStatus,
        sendEmail,
        customMessage: customMessage.trim() || undefined,
        rejectionReason: rejectionReason || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  // Email preview
  const getEmailPreview = () => {
    if (!newStatus || !application) return null;

    const statusLabel = STATUS_LABELS[newStatus as ApplicationStatus];

    return {
      subject: `Application Update - ${application.jobTitle}`,
      body: `
        Hi ${application.candidateName},

        Your application for ${application.jobTitle} has been updated.

        Status: ${statusLabel}

        ${customMessage ? `\n${customMessage}\n` : ''}

        ${newStatus === ApplicationStatus.REJECTED && rejectionReason ? `\nFeedback: ${rejectionReason}\n` : ''}

        Best regards,
        The Hiring Team
      `,
    };
  };

  if (!application) return null;

  const canChangeStatus =
    application.status !== ApplicationStatus.REJECTED &&
    application.status !== ApplicationStatus.HIRED;

  const isRejecting = newStatus === ApplicationStatus.REJECTED;
  const emailPreview = getEmailPreview();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="status-change-modal">
        <DialogHeader>
          <DialogTitle>Change Application Status</DialogTitle>
          <DialogDescription>
            Update status for {application.candidateName}'s application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div>
            <Label className="text-sm text-muted-foreground">Current Status</Label>
            <div className="mt-1">
              <Badge variant="outline" data-testid="current-status">
                {STATUS_LABELS[application.status]}
              </Badge>
            </div>
          </div>

          {/* New Status Selector */}
          <div>
            <Label htmlFor="new-status">New Status *</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as ApplicationStatus)}
              disabled={!canChangeStatus || loading}
            >
              <SelectTrigger
                id="new-status"
                className="mt-1"
                data-testid="status-dropdown"
              >
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ApplicationStatus).map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    data-testid={`status-option-${status}`}
                  >
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!canChangeStatus && (
              <p className="mt-1 text-sm text-muted-foreground">
                Cannot change status of {application.status} application
              </p>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive" data-testid="validation-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Rejection Reason (only shown when rejecting) */}
          {isRejecting && (
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Select
                value={rejectionReason}
                onValueChange={setRejectionReason}
                disabled={loading}
              >
                <SelectTrigger
                  id="rejection-reason"
                  className="mt-1"
                  data-testid="rejection-reason-dropdown"
                >
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Message */}
          {newStatus && (
            <div>
              <Label htmlFor="custom-message">
                Custom Message <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="custom-message"
                placeholder={
                  isRejecting
                    ? 'Add additional feedback for the candidate...'
                    : 'Add a personal note to include in the email...'
                }
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                disabled={loading}
                className="mt-1 min-h-[100px]"
                data-testid="custom-message-input"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                {customMessage.length}/500 characters
              </p>
            </div>
          )}

          {/* Send Email Checkbox */}
          {newStatus && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={loading}
                data-testid="send-email-checkbox"
              />
              <Label
                htmlFor="send-email"
                className="text-sm font-normal cursor-pointer"
              >
                Send email notification to candidate
              </Label>
            </div>
          )}

          {/* Email Preview Button */}
          {newStatus && sendEmail && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmailPreview(!showEmailPreview)}
              disabled={loading}
              data-testid="preview-email-button"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showEmailPreview ? 'Hide' : 'Preview'} Email
            </Button>
          )}

          {/* Email Preview */}
          {showEmailPreview && emailPreview && (
            <div className="rounded-lg border bg-muted/50 p-4" data-testid="email-preview">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Subject:</span>
                  <p className="text-sm text-muted-foreground">{emailPreview.subject}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Message:</span>
                  <pre className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {emailPreview.body}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" data-testid="error-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!newStatus || !!validationError || loading}
            data-testid="confirm-button"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sendEmail && <Mail className="mr-2 h-4 w-4" />}
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
