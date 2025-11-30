'use client';

import { AppShell } from './AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard Layout for Job Seekers
 * Wraps content in AppShell with job_seeker navigation
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <AppShell role="job_seeker">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
