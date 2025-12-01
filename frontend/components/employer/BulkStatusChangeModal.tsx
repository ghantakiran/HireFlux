/**
 * Bulk Status Change Modal Component - Issue #58
 *
 * Modal for bulk status changes with:
 * - List of selected applications
 * - Target status selection
 * - Rejection reason (for bulk reject)
 * - Custom message (applies to all)
 * - Email notification toggle
 * - Partial failure handling
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { ApplicationStatus } from './StatusChangeModal';

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

interface BulkStatusChangeModalProps {
  applications: Application[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: BulkStatusChangeData) => Promise<void>;
  defaultStatus?: ApplicationStatus;
}

export interface BulkStatusChangeData {
  applicationIds: string[];
  newStatus: ApplicationStatus;
  sendEmail: boolean;
  customMessage?: string;
  rejectionReason?: string;
}

export default function BulkStatusChangeModal({
  applications,
  isOpen,
  onClose,
  onConfirm,
  defaultStatus,
}: BulkStatusChangeModalProps) {
  // State
  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>(defaultStatus || '');
  const [sendEmail, setSendEmail] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<{
    invalidCount: number;
    validCount: number;
    message: string;
  } | null>(null);
  const [continueWithValid, setContinueWithValid] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewStatus(defaultStatus || '');
      setSendEmail(true);
      setCustomMessage('');
      setRejectionReason('');
      setError(null);
      setValidationWarning(null);
      setContinueWithValid(false);
    }
  }, [isOpen, defaultStatus]);

  // Validate applications
  useEffect(() => {
    if (!newStatus || applications.length === 0) {
      setValidationWarning(null);
      return;
    }

    // Check for applications that cannot be changed
    const invalidApps = applications.filter(
      (app) =>
        app.status === ApplicationStatus.REJECTED ||
        app.status === ApplicationStatus.HIRED
    );

    if (invalidApps.length > 0) {
      const validCount = applications.length - invalidApps.length;
      const invalidReasons = [
        ...new Set(
          invalidApps.map((app) =>
            app.status === ApplicationStatus.REJECTED ? 'rejected' : 'hired'
          )
        ),
      ].join(' or ');

      setValidationWarning({
        invalidCount: invalidApps.length,
        validCount,
        message: `${invalidApps.length} application${
          invalidApps.length !== 1 ? 's' : ''
        } cannot be changed (already ${invalidReasons})`,
      });
    } else {
      setValidationWarning(null);
    }
  }, [applications, newStatus]);

  // Handle confirmation
  const handleConfirm = async () => {
    if (!newStatus) return;

    // Validate rejection reason
    if (newStatus === ApplicationStatus.REJECTED && !rejectionReason) {
      setError('Please select a rejection reason');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filter out invalid applications if continuing with valid ones
      let applicationsToUpdate = applications;
      if (validationWarning && continueWithValid) {
        applicationsToUpdate = applications.filter(
          (app) =>
            app.status !== ApplicationStatus.REJECTED &&
            app.status !== ApplicationStatus.HIRED
        );
      }

      await onConfirm({
        applicationIds: applicationsToUpdate.map((app) => app.id),
        newStatus: newStatus as ApplicationStatus,
        sendEmail,
        customMessage: customMessage.trim() || undefined,
        rejectionReason: rejectionReason || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (applications.length === 0) return null;

  const isRejecting = newStatus === ApplicationStatus.REJECTED;
  const hasValidationWarning = validationWarning && validationWarning.invalidCount > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="bulk-status-change-modal">
        <DialogHeader>
          <DialogTitle>Bulk Status Change</DialogTitle>
          <DialogDescription>
            Update status for {applications.length} selected application
            {applications.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected Applications Preview */}
          <div>
            <Label className="text-sm text-muted-foreground">Selected Applications</Label>
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md border">
              <div className="divide-y">
                {applications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="px-3 py-2 text-sm"
                    data-testid="selected-application"
                  >
                    <div className="font-medium">{app.candidateName}</div>
                    <div className="text-muted-foreground">
                      {app.jobTitle} • {STATUS_LABELS[app.status]}
                    </div>
                  </div>
                ))}
                {applications.length > 5 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    + {applications.length - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New Status Selector */}
          <div>
            <Label htmlFor="bulk-new-status">New Status *</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as ApplicationStatus)}
              disabled={loading}
            >
              <SelectTrigger
                id="bulk-new-status"
                className="mt-1"
                data-testid="bulk-status-dropdown"
              >
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ApplicationStatus).map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    data-testid={`bulk-status-option-${status}`}
                  >
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Validation Warning */}
          {hasValidationWarning && (
            <Alert variant="destructive" data-testid="validation-warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p>{validationWarning.message}</p>
                {validationWarning.validCount > 0 && (
                  <div className="mt-2 flex items-center space-x-2">
                    <Checkbox
                      id="continue-with-valid"
                      checked={continueWithValid}
                      onChange={(e) => setContinueWithValid(e.target.checked)}
                      data-testid="continue-with-valid-checkbox"
                    />
                    <Label htmlFor="continue-with-valid" className="text-sm font-normal">
                      Continue with {validationWarning.validCount} valid application
                      {validationWarning.validCount !== 1 ? 's' : ''}
                    </Label>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Rejection Reason (only shown when rejecting) */}
          {isRejecting && (
            <div>
              <Label htmlFor="bulk-rejection-reason">Rejection Reason *</Label>
              <Select
                value={rejectionReason}
                onValueChange={setRejectionReason}
                disabled={loading}
              >
                <SelectTrigger
                  id="bulk-rejection-reason"
                  className="mt-1"
                  data-testid="bulk-rejection-reason-dropdown"
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
              <Label htmlFor="bulk-custom-message">
                Custom Message <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="bulk-custom-message"
                placeholder={
                  isRejecting
                    ? 'Add feedback that will be sent to all candidates...'
                    : 'Add a message that will be sent to all candidates...'
                }
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                disabled={loading}
                className="mt-1 min-h-[100px]"
                data-testid="bulk-custom-message-input"
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
                id="bulk-send-email"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={loading}
                data-testid="bulk-send-email-checkbox"
              />
              <Label
                htmlFor="bulk-send-email"
                className="text-sm font-normal cursor-pointer"
              >
                Send email notifications to all candidates
              </Label>
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
            onClick={onClose}
            disabled={loading}
            data-testid="bulk-cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={
              !newStatus ||
              (hasValidationWarning &&
                !continueWithValid &&
                validationWarning.validCount === 0) ||
              loading
            }
            data-testid="bulk-confirm-button"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRejecting ? 'Reject' : 'Update'}{' '}
            {hasValidationWarning && continueWithValid
              ? validationWarning.validCount
              : applications.length}{' '}
            Application{applications.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
