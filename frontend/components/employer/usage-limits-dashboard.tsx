/**
 * Usage Limits Dashboard Component (Issue #64)
 * Main dashboard for displaying all usage metrics
 */

'use client';

import React, { useEffect, useState } from 'react';
import { UsageMeter } from './usage-meter';
import { UpgradeModal } from './upgrade-modal';
import { LimitWarning } from './limit-warning';
import { billingApi } from '@/lib/api';
import { UsageLimits, UpgradeRecommendation } from '@/lib/types/usage-limits';
import { getErrorMessage } from '@/lib/api-error-handler';

export interface UsageLimitsDashboardProps {
  'data-testid'?: string;
}

export function UsageLimitsDashboard({ 'data-testid': dataTestId }: UsageLimitsDashboardProps) {
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [upgradeRecommendation, setUpgradeRecommendation] = useState<UpgradeRecommendation | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  // Fetch usage limits on mount
  useEffect(() => {
    fetchUsageLimits();
  }, []);

  const fetchUsageLimits = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await billingApi.getUsageLimits();
      if (response.data.success) {
        setUsageLimits(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch usage limits:', err);
      setError(getErrorMessage(err, 'Failed to load usage limits'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUpgradeRecommendation = async () => {
    try {
      const response = await billingApi.getUpgradeRecommendation();
      if (response.data.success) {
        setUpgradeRecommendation(response.data.data);
        setIsUpgradeModalOpen(true);
      }
    } catch (err: unknown) {
      // No upgrade needed - this is expected, so we only log for debugging
      console.error('Failed to fetch upgrade recommendation:', err);
    }
  };

  const handleUpgrade = async (plan: string) => {
    // Navigate to upgrade flow
    window.location.href = `/employer/billing/upgrade?plan=${plan}`;
  };

  const handleDismissWarning = (resource: string) => {
    setDismissedWarnings(prev => new Set(prev).add(resource));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid={`${dataTestId}-loading`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading usage data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 rounded-lg" data-testid={`${dataTestId}-error`}>
        <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        <button
          onClick={fetchUsageLimits}
          className="mt-2 text-sm text-red-700 dark:text-red-400 font-medium underline hover:text-red-900 dark:hover:text-red-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!usageLimits) {
    return null;
  }

  // Determine which warnings to show
  const shouldShowWarning = (resource: keyof UsageLimits, percentage: number) => {
    if (dismissedWarnings.has(resource)) return false;
    return percentage >= 80;
  };

  return (
    <div className="space-y-6" data-testid={dataTestId}>
      {/* Warning Banners */}
      <div className="space-y-3">
        {shouldShowWarning('jobs', usageLimits.jobs.percentage) && (
          <LimitWarning
            resource="jobs"
            resourceLabel="Job Posting"
            percentage={usageLimits.jobs.percentage}
            message={
              usageLimits.jobs.percentage >= 100
                ? `You've reached your job posting limit (${usageLimits.jobs.limit} jobs). Upgrade to post more jobs.`
                : `You're at ${usageLimits.jobs.percentage.toFixed(0)}% of your job posting limit (${usageLimits.jobs.used}/${usageLimits.jobs.limit}). Consider upgrading soon.`
            }
            onUpgrade={fetchUpgradeRecommendation}
            onDismiss={() => handleDismissWarning('jobs')}
            data-testid={`${dataTestId}-jobs-warning`}
          />
        )}

        {shouldShowWarning('candidate_views', usageLimits.candidate_views.percentage) && (
          <LimitWarning
            resource="candidate_views"
            resourceLabel="Candidate Views"
            percentage={usageLimits.candidate_views.percentage}
            message={
              usageLimits.candidate_views.percentage >= 100
                ? `You've reached your candidate view limit (${usageLimits.candidate_views.limit} views). Upgrade to view more candidates.`
                : `You're at ${usageLimits.candidate_views.percentage.toFixed(0)}% of your candidate view limit (${usageLimits.candidate_views.used}/${usageLimits.candidate_views.limit}).`
            }
            onUpgrade={fetchUpgradeRecommendation}
            onDismiss={() => handleDismissWarning('candidate_views')}
            data-testid={`${dataTestId}-views-warning`}
          />
        )}

        {shouldShowWarning('team_members', usageLimits.team_members.percentage) && (
          <LimitWarning
            resource="team_members"
            resourceLabel="Team Members"
            percentage={usageLimits.team_members.percentage}
            message={
              usageLimits.team_members.percentage >= 100
                ? `You've reached your team member limit (${usageLimits.team_members.limit} members). Upgrade to add more team members.`
                : `You're at ${usageLimits.team_members.percentage.toFixed(0)}% of your team member limit (${usageLimits.team_members.used}/${usageLimits.team_members.limit}).`
            }
            onUpgrade={fetchUpgradeRecommendation}
            onDismiss={() => handleDismissWarning('team_members')}
            data-testid={`${dataTestId}-members-warning`}
          />
        )}
      </div>

      {/* Usage Meters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageMeter
          resource="jobs"
          label="Job Postings"
          usage={usageLimits.jobs}
          onUpgrade={fetchUpgradeRecommendation}
          data-testid={`${dataTestId}-jobs-meter`}
        />

        <UsageMeter
          resource="candidate_views"
          label="Candidate Views"
          usage={usageLimits.candidate_views}
          onUpgrade={fetchUpgradeRecommendation}
          data-testid={`${dataTestId}-views-meter`}
        />

        <UsageMeter
          resource="team_members"
          label="Team Members"
          usage={usageLimits.team_members}
          onUpgrade={fetchUpgradeRecommendation}
          data-testid={`${dataTestId}-members-meter`}
        />
      </div>

      {/* Current Plan Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Plan</h3>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize" data-testid={`${dataTestId}-plan`}>
              {usageLimits.plan}
            </p>
          </div>
          <button
            onClick={fetchUpgradeRecommendation}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            data-testid={`${dataTestId}-upgrade-cta`}
          >
            View Upgrade Options
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      {upgradeRecommendation && (
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          recommendation={upgradeRecommendation}
          onUpgrade={handleUpgrade}
          data-testid={`${dataTestId}-upgrade-modal`}
        />
      )}
    </div>
  );
}
