/**
 * Verified Badge Component - Issue #67
 *
 * Displays a verified badge for companies that have completed domain verification.
 * Can be used in:
 * - Company profile headers
 * - Job postings
 * - Application lists
 * - Search results
 *
 * Fetches verification status from API and displays appropriate badge.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  companyId?: string;
  className?: string;
  showText?: boolean;
}

interface BadgeData {
  verified: boolean;
  verified_at?: string;
  badge_html?: string;
}

export function VerifiedBadge({
  companyId,
  className = '',
  showText = true,
}: VerifiedBadgeProps) {
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadgeData();
  }, [companyId]);

  const fetchBadgeData = async () => {
    try {
      const url = companyId
        ? `/api/employer/domain-verification/badge?company_id=${companyId}`
        : '/api/employer/domain-verification/badge';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBadgeData(data);
      }
    } catch (err) {
      console.error('Error fetching badge data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !badgeData?.verified) {
    return null;
  }

  const verifiedDate = badgeData.verified_at
    ? formatDate(badgeData.verified_at)
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="default"
            className={`bg-green-600 hover:bg-green-700 ${className}`}
            data-testid="verified-badge"
          >
            <Shield className="h-3 w-3 mr-1" />
            {showText && 'Verified'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Domain verified company
            {verifiedDate && (
              <>
                <br />
                Verified on: {verifiedDate}
              </>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline Verified Icon - Simple check mark without badge styling
 */
export function VerifiedIcon({ companyId, className = '' }: { companyId?: string; className?: string }) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const url = companyId
          ? `/api/employer/domain-verification/badge?company_id=${companyId}`
          : '/api/employer/domain-verification/badge';

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setVerified(data.verified);
        }
      } catch (err) {
        console.error('Error fetching verification status:', err);
      }
    };

    fetchStatus();
  }, [companyId]);

  if (!verified) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckCircle
            className={`inline-block text-green-600 ${className}`}
            data-testid="verified-icon"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Verified company</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
