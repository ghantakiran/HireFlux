'use client';

import { AppShell } from './AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface EmployerDashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard Layout for Employers
 * Wraps content in AppShell with employer navigation
 */
export function EmployerDashboardLayout({ children }: EmployerDashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <AppShell role="employer">
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
