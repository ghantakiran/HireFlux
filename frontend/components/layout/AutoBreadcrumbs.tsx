'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * Route segment → human-readable label mapping.
 * Covers all dashboard and employer route segments.
 */
const ROUTE_LABELS: Record<string, string> = {
  // Top-level
  dashboard: 'Dashboard',
  employer: 'Employer',

  // Job Seeker sections
  resumes: 'Resumes',
  'cover-letters': 'Cover Letters',
  applications: 'Applications',
  jobs: 'Jobs',
  'auto-apply': 'Auto Apply',
  'interview-buddy': 'Interview Buddy',
  'ai-suggestions': 'AI Suggestions',
  feedback: 'Feedback',
  notifications: 'Notifications',

  // Settings
  settings: 'Settings',
  profile: 'Profile',
  subscription: 'Subscription',
  credits: 'Credits',
  onboarding: 'Onboarding',

  // Resume actions
  builder: 'Resume Builder',
  upload: 'Upload',
  edit: 'Edit',
  new: 'New',

  // Employer sections
  candidates: 'Candidates',
  assessments: 'Assessments',
  analytics: 'Analytics',
  team: 'Team',
  templates: 'Templates',
  interviews: 'Interviews',
  'company-profile': 'Company Profile',
  'api-keys': 'API Keys',
  'bulk-upload': 'Bulk Upload',
  'white-label': 'White Label',
  register: 'Register',
  'verify-email': 'Verify Email',

  // Shared
  results: 'Results',
};

/**
 * Detect dynamic route segments (UUIDs, hex hashes, numeric IDs).
 */
function isDynamicSegment(segment: string): boolean {
  // UUID v4
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment
    )
  )
    return true;
  // Hex hash (6+ chars, all hex)
  if (/^[0-9a-f]{6,}$/i.test(segment)) return true;
  // Numeric ID
  if (/^\d+$/.test(segment)) return true;
  return false;
}

/**
 * Get a human-readable label for a route segment.
 */
function getLabel(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  if (isDynamicSegment(segment)) return 'Details';
  // Fallback: kebab-case → Title Case
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Auto-generating breadcrumb navigation based on the current pathname.
 *
 * - Hides on top-level pages (≤1 segment)
 * - Maps known route segments to readable labels
 * - Detects dynamic segments (UUIDs, IDs) and labels them "Details"
 * - All segments except the last are clickable links
 */
export function AutoBreadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);

  // Don't render breadcrumbs on top-level pages
  if (segments.length <= 1) return null;

  const items = segments.map((segment, index) => ({
    label: getLabel(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
