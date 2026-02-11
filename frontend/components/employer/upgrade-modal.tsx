/**
 * Upgrade Modal Component (Issue #64)
 * Modal for displaying upgrade recommendations with plan benefits
 */

'use client';

import React from 'react';
import { UpgradeRecommendation } from '@/lib/types/usage-limits';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: UpgradeRecommendation;
  onUpgrade: (plan: string) => void;
  'data-testid'?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  recommendation,
  onUpgrade,
  'data-testid': dataTestId
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const { recommended_plan, current_plan, reason, benefits, price_increase } = recommendation;

  const planDisplayNames: Record<string, string> = {
    starter: 'Starter',
    growth: 'Growth',
    professional: 'Professional',
    enterprise: 'Enterprise'
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      data-testid={dataTestId}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
        data-testid={`${dataTestId}-overlay`}
      />

      {/* Modal panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
          data-testid={`${dataTestId}-panel`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
            <div className="flex items-center justify-between">
              <h3
                className="text-xl font-bold text-white"
                id="modal-title"
                data-testid={`${dataTestId}-title`}
              >
                Upgrade to {planDisplayNames[recommended_plan]} Plan
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close"
                data-testid={`${dataTestId}-close`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {/* Reason */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300" data-testid={`${dataTestId}-reason`}>
                  {reason}
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                Your current plan ({planDisplayNames[current_plan]}) doesn't meet your needs.
              </p>
            </div>

            {/* Benefits */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                What you'll get with {planDisplayNames[recommended_plan]}:
              </h4>
              <ul className="space-y-2" data-testid={`${dataTestId}-benefits`}>
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Price increase:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid={`${dataTestId}-price`}>
                    ${price_increase}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">/month</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid={`${dataTestId}-cancel`}
              >
                Not Now
              </button>
              <button
                onClick={() => onUpgrade(recommended_plan)}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                data-testid={`${dataTestId}-confirm`}
              >
                Upgrade to {planDisplayNames[recommended_plan]}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              You can cancel or change your plan anytime from your billing settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
