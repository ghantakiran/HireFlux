'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Mail,
  Calendar,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  User,
  CreditCard,
  Sparkles,
  Target,
  MessageSquare,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Resumes', href: '/dashboard/resumes', icon: FileText },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { name: 'Applications', href: '/dashboard/applications', icon: Target },
  { name: 'Cover Letters', href: '/dashboard/cover-letters', icon: Mail },
  { name: 'Interview Buddy', href: '/dashboard/interview-buddy', icon: MessageSquare },
  { name: 'Auto Apply', href: '/dashboard/auto-apply', icon: Sparkles },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: 0 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar */}
        <div
          className={`fixed inset-0 z-50 lg:hidden ${
            sidebarOpen ? 'block' : 'hidden'
          }`}
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center justify-between px-6 border-b">
                <Link href="/dashboard" className="flex items-center">
                  <span className="text-2xl font-bold text-blue-600">HireFlux</span>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-2 hover:bg-gray-100"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User profile */}
              <div className="border-t p-4">
                <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
                    {user?.first_name?.[0]}
                    {user?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-col bg-white border-r border-gray-200 h-full">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">HireFlux</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User profile */}
            <div className="border-t p-4">
              <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
                  {user?.first_name?.[0]}
                  {user?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center justify-end">
              {/* Credit balance */}
              {user?.subscription_tier && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Plan</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {user.subscription_tier}
                    </p>
                  </div>
                </div>
              )}

              {/* Notifications */}
              <button className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100">
                <Bell className="h-6 w-6" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>
            </div>
          </div>

          {/* Page content */}
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
