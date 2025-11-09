'use client';

/**
 * Cost Metrics Card Component (Owner/Admin Only)
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React from 'react';
import { CostMetrics } from '@/lib/hooks/useEmployerAnalytics';

interface CostMetricsCardProps {
  data: CostMetrics;
  isLoading?: boolean;
  userRole?: string;
}

export function CostMetricsCard({ data, isLoading, userRole }: CostMetricsCardProps) {
  // Hide for non-owner/admin roles (RBAC)
  if (userRole && !['owner', 'admin'].includes(userRole.toLowerCase())) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const costPerApp = parseFloat(data.cost_per_application);
  const costPerHire = parseFloat(data.cost_per_hire);
  const roi = parseFloat(data.roi);
  const subscriptionCost = parseFloat(data.total_subscription_cost);

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="cost-metrics-card">
      {/* Header with RBAC Badge */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cost Metrics</h3>
            <p className="text-sm text-gray-600 mt-1">Financial efficiency metrics</p>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
            Owner/Admin Only
          </span>
        </div>
      </div>

      {/* Main Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Cost per Application */}
        <div
          data-testid="cost-per-application"
          className="p-5 rounded-lg border-2 border-blue-200 bg-blue-50"
        >
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Cost per Application</h4>
            <p className="text-xs text-gray-600">Average cost to attract one applicant</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600" aria-label="Cost per application">
              ${costPerApp.toFixed(2)}
            </p>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            {data.total_applications} applications
          </div>
        </div>

        {/* Cost per Hire */}
        <div
          data-testid="cost-per-hire"
          className="p-5 rounded-lg border-2 border-green-200 bg-green-50"
        >
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Cost per Hire</h4>
            <p className="text-xs text-gray-600">Average cost to make one hire</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600" aria-label="Cost per hire">
              ${costPerHire.toFixed(2)}
            </p>
          </div>
          <div className="mt-3 text-xs text-gray-600">{data.total_hires} hires</div>
        </div>

        {/* ROI */}
        <div
          data-testid="cost-roi"
          className="p-5 rounded-lg border-2 border-purple-200 bg-purple-50"
        >
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Return on Investment</h4>
            <p className="text-xs text-gray-600">Value generated per dollar spent</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-600" aria-label="ROI">
              {roi.toFixed(1)}x
            </p>
          </div>
          <div className="mt-3 text-xs">
            {roi >= 10 && <span className="text-green-600 font-medium">✓ Excellent</span>}
            {roi >= 5 && roi < 10 && (
              <span className="text-orange-600 font-medium">→ Good</span>
            )}
            {roi < 5 && <span className="text-red-600 font-medium">↓ Needs Improvement</span>}
          </div>
        </div>
      </div>

      {/* Subscription Cost Breakdown */}
      <div className="p-5 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Total Subscription Cost</h4>
            <p className="text-xs text-gray-600">
              {data.start_date} to {data.end_date}
            </p>
          </div>
          <p className="text-3xl font-bold text-gray-900">${subscriptionCost.toFixed(2)}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Applications</p>
            <p className="font-semibold text-gray-900">{data.total_applications}</p>
          </div>
          <div>
            <p className="text-gray-600">Hires</p>
            <p className="font-semibold text-gray-900">{data.total_hires}</p>
          </div>
          <div>
            <p className="text-gray-600">Conversion</p>
            <p className="font-semibold text-green-600">
              {((data.total_hires / data.total_applications) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Cost Efficiency Indicators */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">Cost Efficiency</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  costPerHire < 50
                    ? 'bg-green-600'
                    : costPerHire < 100
                    ? 'bg-orange-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${Math.min((50 / costPerHire) * 100, 100)}%` }}
                role="progressbar"
                aria-label="Cost efficiency"
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {costPerHire < 50 ? 'High' : costPerHire < 100 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>
        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">ROI Performance</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  roi >= 10 ? 'bg-green-600' : roi >= 5 ? 'bg-orange-600' : 'bg-red-600'
                }`}
                style={{ width: `${Math.min((roi / 20) * 100, 100)}%` }}
                role="progressbar"
                aria-label="ROI performance"
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {roi >= 10 ? 'High' : roi >= 5 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
