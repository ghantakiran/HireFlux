'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  Search,
  Bell,
  MessageSquare,
  MoreHorizontal,
  LayoutDashboard,
  Target,
  FileText,
  Mail,
  Video,
  User,
  Briefcase,
  Users,
  Building,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  dataAttr: string;
}

const JOB_SEEKER_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, dataAttr: 'dashboard' },
  { name: 'Job Search', href: '/jobs', icon: Search, dataAttr: 'job-search' },
  { name: 'Applications', href: '/dashboard/applications', icon: Target, dataAttr: 'applications' },
  { name: 'Resumes', href: '/dashboard/resumes', icon: FileText, dataAttr: 'resumes' },
  { name: 'Cover Letters', href: '/dashboard/cover-letters', icon: Mail, dataAttr: 'cover-letters' },
  { name: 'Interview Prep', href: '/dashboard/interview-prep', icon: Video, dataAttr: 'interview-prep' },
  { name: 'Profile', href: '/settings/profile', icon: User, dataAttr: 'profile' },
  { name: 'Settings', href: '/settings', icon: Settings, dataAttr: 'settings' },
  { name: 'Help & Support', href: '/help', icon: HelpCircle, dataAttr: 'help' },
];

const EMPLOYER_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard, dataAttr: 'dashboard' },
  { name: 'Jobs', href: '/employer/jobs', icon: Briefcase, dataAttr: 'jobs' },
  { name: 'Candidates', href: '/employer/candidates', icon: Users, dataAttr: 'candidates' },
  { name: 'Applications', href: '/employer/applications', icon: Target, dataAttr: 'applications' },
  { name: 'Team', href: '/employer/team', icon: Users, dataAttr: 'team' },
  { name: 'Analytics', href: '/employer/analytics', icon: BarChart3, dataAttr: 'analytics' },
  { name: 'Company Profile', href: '/employer/company', icon: Building, dataAttr: 'company-profile' },
  { name: 'Settings', href: '/employer/settings', icon: Settings, dataAttr: 'settings' },
  { name: 'Help & Support', href: '/help', icon: HelpCircle, dataAttr: 'help' },
];

interface MobileNavProps {
  role?: 'job_seeker' | 'employer';
}

/**
 * Mobile Hamburger Menu with Drawer
 */
export function MobileHamburgerMenu({ role = 'job_seeker' }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const navigationItems = role === 'employer' ? EMPLOYER_NAV : JOB_SEEKER_NAV;

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/employer/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Top Bar (visible only on mobile) */}
      {/* Elements use tabIndex={-1} to prevent focus when hidden on desktop - Issue #149 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b flex items-center justify-between px-4">
        {/* Hamburger Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          data-hamburger-icon
          aria-label="Open menu"
          className="lg:sr-only"
          tabIndex={-1}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Logo (centered on mobile) */}
        <Link
          href={role === 'employer' ? '/employer/dashboard' : '/dashboard'}
          data-logo
          className="lg:sr-only"
          tabIndex={-1}
        >
          <span className="text-xl font-bold text-blue-600">HireFlux</span>
        </Link>

        {/* User Avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold lg:sr-only"
          data-profile-menu-trigger
          tabIndex={-1}
        >
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
      </div>

      {/* Drawer Navigation */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-4/5 p-0"
          data-nav-drawer
          onEscapeKeyDown={() => setOpen(false)}
          onInteractOutside={() => setOpen(false)}
        >
          <div className="flex h-full flex-col" data-drawer-overlay>
            {/* Header */}
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>

            {/* Navigation Items */}
            <nav
              className="flex-1 overflow-y-auto py-4"
              role="navigation"
              aria-label="Mobile menu navigation"
            >
              <ul className="space-y-1 px-4">
                {navigationItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        data-drawer-nav={item.dataAttr}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer - User Info & Sign Out */}
            <div className="border-t p-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg p-3 bg-gray-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-600"
                data-drawer-nav-sign-out
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Mobile Bottom Tab Bar
 */
export function MobileBottomTabBar({ role = 'job_seeker' }: MobileNavProps) {
  const pathname = usePathname();

  // Mock notification count
  const notificationCount = 3;

  const tabs = [
    {
      name: 'Home',
      href: role === 'employer' ? '/employer/dashboard' : '/dashboard',
      icon: Home,
      dataAttr: 'home',
    },
    {
      name: 'Search',
      href: role === 'employer' ? '/employer/candidates' : '/jobs',
      icon: Search,
      dataAttr: 'search',
    },
    {
      name: 'Activity',
      href: role === 'employer' ? '/employer/applications' : '/dashboard/applications',
      icon: Bell,
      dataAttr: 'activity',
      badge: notificationCount,
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      dataAttr: 'messages',
    },
    {
      name: 'More',
      href: '/settings',
      icon: MoreHorizontal,
      dataAttr: 'more',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/employer/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      role="navigation"
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t"
      data-bottom-tab-bar
    >
      <ul className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <li key={tab.name}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center justify-center h-full relative transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-600'
                }`}
                data-tab={tab.dataAttr}
                data-active={active ? 'true' : 'false'}
                style={{ minHeight: '48px', minWidth: '48px' }}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {tab.badge && tab.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-2 -top-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                      data-tab-badge={tab.dataAttr}
                    >
                      {tab.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs mt-1">{tab.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
