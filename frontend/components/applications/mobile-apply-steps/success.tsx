'use client';

/**
 * Success Screen
 * Issue #142: Application submission success confirmation
 *
 * Features:
 * - Success animation
 * - Application reference number
 * - Action buttons (View Application, Apply to More Jobs, Done)
 * - Celebration effect
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, Eye, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessScreenProps {
  jobTitle: string;
  companyName: string;
  referenceNumber: string;
  onClose: () => void;
  onViewApplication: () => void;
  onApplyMore: () => void;
}

export function SuccessScreen({
  jobTitle,
  companyName,
  referenceNumber,
  onClose,
  onViewApplication,
  onApplyMore,
}: SuccessScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger celebration effect on mount
  useEffect(() => {
    setShowConfetti(true);

    // Hide confetti after animation
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div data-application-success className="h-full flex flex-col">
      {/* Close Button */}
      <div className="p-4 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close"
          className="h-10 w-10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Success Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Success Icon with Animation */}
        <div className="relative mb-6">
          {/* Confetti Effect */}
          {showConfetti && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-ping absolute inline-flex h-32 w-32 rounded-full bg-green-400 opacity-75" />
            </div>
          )}

          {/* Check Icon */}
          <div className="relative">
            <CheckCircle className="h-24 w-24 text-green-600 animate-in zoom-in duration-500" />
          </div>
        </div>

        {/* Success Message */}
        <h1 data-success-message className="text-2xl font-bold text-gray-900 mb-2">
          Application Submitted!
        </h1>

        <p className="text-base text-gray-600 mb-6">
          Your application for <strong>{jobTitle}</strong> at{' '}
          <strong>{companyName}</strong> has been successfully submitted.
        </p>

        {/* Reference Number */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg w-full max-w-sm mb-8">
          <p className="text-xs text-gray-500 mb-1">Application Reference</p>
          <p data-ref-number className="text-lg font-mono font-semibold text-gray-900">
            {referenceNumber}
          </p>
        </div>

        {/* What Happens Next */}
        <div className="w-full max-w-sm text-left p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">What happens next?</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✅ You'll receive a confirmation email shortly</li>
            <li>👀 The hiring team will review your application</li>
            <li>📞 They'll contact you if there's a match</li>
            <li>⏱️ Average response time: 3-5 business days</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 space-y-3"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
        }}
      >
        {/* View Application Button */}
        <Button
          data-view-application
          onClick={onViewApplication}
          className="w-full h-12 text-base font-semibold"
        >
          <Eye className="h-5 w-5 mr-2" />
          View Application Status
        </Button>

        {/* Apply to More Jobs Button */}
        <Button
          data-apply-more
          onClick={onApplyMore}
          variant="outline"
          className="w-full h-12 text-base font-semibold"
        >
          <Search className="h-5 w-5 mr-2" />
          Explore More Jobs
        </Button>

        {/* Done Button */}
        <Button
          data-done-button
          onClick={onClose}
          variant="ghost"
          className="w-full h-12 text-base"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
