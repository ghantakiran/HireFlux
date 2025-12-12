/**
 * Permission Error Components (403)
 * Displays permission/upgrade required errors
 */

'use client';

import React from 'react';
import { Lock, Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export interface PermissionErrorProps {
  requiredPlan?: string;
  currentPlan?: string;
  feature?: string;
  benefits?: string[];
  onUpgrade?: () => void;
}

export function PermissionError({
  requiredPlan = 'Pro',
  currentPlan = 'Free',
  feature = 'this feature',
  benefits = [],
  onUpgrade,
}: PermissionErrorProps) {
  const defaultBenefits = [
    'Unlimited resumes and cover letters',
    'Auto-apply to 50+ jobs per month',
    'Priority job matching',
    'Interview preparation tools',
    'Advanced analytics',
  ];

  const displayBenefits = benefits.length > 0 ? benefits : defaultBenefits;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Alert className="max-w-lg border-amber-500 bg-amber-50 dark:bg-amber-900/10" data-testid="permission-error">
        <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          Upgrade Required
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <p className="mb-4">
            {feature} requires a <strong>{requiredPlan}</strong> plan.
            {currentPlan && ` You're currently on the ${currentPlan} plan.`}
          </p>

          {/* Benefits */}
          {displayBenefits.length > 0 && (
            <div className="mb-4" data-testid="upgrade-benefits">
              <p className="font-medium mb-2">Upgrade to {requiredPlan} and get:</p>
              <ul className="space-y-1">
                {displayBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Plan Info */}
          {currentPlan && (
            <div className="text-xs bg-amber-100 dark:bg-amber-900/20 rounded p-2 mb-4">
              Current Plan: <strong>{currentPlan}</strong>
            </div>
          )}

          {/* Upgrade Button */}
          <div className="flex gap-2">
            {onUpgrade ? (
              <Button onClick={onUpgrade} size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Now
              </Button>
            ) : (
              <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Link href="/pricing">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade Now
                </Link>
              </Button>
            )}

            <Button asChild variant="outline" size="sm">
              <Link href="/pricing">Compare Plans</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
