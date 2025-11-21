/**
 * TypeScript types for Usage Limits (Issue #64)
 */

export interface ResourceUsage {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  percentage: number;
}

export interface UsageLimits {
  plan: string;
  jobs: ResourceUsage;
  candidate_views: ResourceUsage;
  team_members: ResourceUsage;
}

export interface UsageCheckResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  warning: boolean;
  upgrade_required: boolean;
  message: string;
}

export interface UpgradeRecommendation {
  recommended_plan: string;
  current_plan: string;
  reason: string;
  benefits: string[];
  price_increase: number;
}
