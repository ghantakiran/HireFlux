'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Target,
  FileText,
  Mail,
  Video,
  User,
  Briefcase,
  Users,
  Building,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  dataAttr: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const JOB_SEEKER_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, dataAttr: 'dashboard' },
    ],
  },
  {
    label: 'Job Search',
    items: [
      { name: 'Job Search', href: '/jobs', icon: Search, dataAttr: 'job-search' },
      { name: 'Applications', href: '/dashboard/applications', icon: Target, dataAttr: 'applications' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'Resumes', href: '/dashboard/resumes', icon: FileText, dataAttr: 'resumes' },
      { name: 'Cover Letters', href: '/dashboard/cover-letters', icon: Mail, dataAttr: 'cover-letters' },
      { name: 'Interview Prep', href: '/dashboard/interview-prep', icon: Video, dataAttr: 'interview-prep' },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Profile', href: '/settings/profile', icon: User, dataAttr: 'profile' },
      { name: 'Settings', href: '/settings', icon: Settings, dataAttr: 'settings' },
    ],
  },
];

const EMPLOYER_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard, dataAttr: 'dashboard' },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { name: 'Jobs', href: '/employer/jobs', icon: Briefcase, dataAttr: 'jobs' },
      { name: 'Candidates', href: '/employer/candidates', icon: Users, dataAttr: 'candidates' },
      { name: 'Applications', href: '/employer/applications', icon: Target, dataAttr: 'applications' },
    ],
  },
  {
    label: 'Team & Analytics',
    items: [
      { name: 'Team', href: '/employer/team', icon: Users, dataAttr: 'team' },
      { name: 'Analytics', href: '/employer/analytics', icon: BarChart3, dataAttr: 'analytics' },
    ],
  },
  {
    label: 'Company',
    items: [
      { name: 'Company Profile', href: '/employer/company', icon: Building, dataAttr: 'company-profile' },
      { name: 'Settings', href: '/employer/settings', icon: Settings, dataAttr: 'employer-settings' },
    ],
  },
];

interface RecentPage {
  name: string;
  href: string;
}

interface LeftSidebarProps {
  role?: 'job_seeker' | 'employer';
}

export function LeftSidebar({ role = 'job_seeker' }: LeftSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  const navGroups = role === 'employer' ? EMPLOYER_GROUPS : JOB_SEEKER_GROUPS;

  // Flatten groups for lookups
  const allItems = navGroups.flatMap((g) => g.items);

  // Persist collapse state in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setCollapsed(savedState === 'true');
    }
    const savedSections = localStorage.getItem('sidebar-sections');
    if (savedSections) {
      try {
        setCollapsedSections(JSON.parse(savedSections));
      } catch {
        // ignore invalid JSON
      }
    }
    const savedRecent = localStorage.getItem('sidebar-recent');
    if (savedRecent) {
      try {
        setRecentPages(JSON.parse(savedRecent));
      } catch {
        // ignore
      }
    }
  }, []);

  // Track recent pages
  useEffect(() => {
    const currentItem = allItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
    if (!currentItem) return;

    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.href !== currentItem.href);
      const updated = [{ name: currentItem.name, href: currentItem.href }, ...filtered].slice(0, 3);
      localStorage.setItem('sidebar-recent', JSON.stringify(updated));
      return updated;
    });
  }, [pathname]);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const toggleSection = useCallback((label: string) => {
    setCollapsedSections((prev) => {
      const updated = { ...prev, [label]: !prev[label] };
      localStorage.setItem('sidebar-sections', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/employer/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        } ${collapsed ? 'justify-center' : ''}`}
        {...{ [`data-nav-${item.dataAttr}`]: '' }}
        aria-current={active ? 'page' : undefined}
        data-active={active ? 'true' : 'false'}
      >
        <Icon className="h-5 w-5 flex-shrink-0" data-nav-icon />
        {!collapsed && (
          <span className="flex-1" data-nav-text>
            {item.name}
          </span>
        )}
      </Link>
    );

    return (
      <li key={item.name}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {linkContent}
            </TooltipTrigger>
            <TooltipContent side="right" data-nav-tooltip>
              {item.name}
            </TooltipContent>
          </Tooltip>
        ) : (
          linkContent
        )}
      </li>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ${
          collapsed ? 'lg:w-16' : 'lg:w-60'
        } border-r border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700`}
        data-left-sidebar
        style={{ width: collapsed ? '64px' : '240px' }}
      >
        {/* Collapse Button */}
        <div className="flex h-16 items-center justify-end px-2 border-b dark:border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            data-sidebar-collapse-button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            tabIndex={0}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          {/* Recent Pages (expanded mode only) */}
          {!collapsed && recentPages.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 px-3 mb-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Recent
                </span>
              </div>
              <ul className="space-y-0.5">
                {recentPages.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                        isActive(page.href)
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {page.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-b border-gray-100 dark:border-gray-800 mt-3 mb-2" />
            </div>
          )}

          {/* Grouped Navigation */}
          {collapsed ? (
            // Collapsed mode: flat icon list
            <ul className="space-y-1">
              {allItems.map(renderNavItem)}
            </ul>
          ) : (
            // Expanded mode: grouped sections
            <div className="space-y-3">
              {navGroups.map((group) => {
                const isSectionCollapsed = collapsedSections[group.label] ?? false;

                return (
                  <div key={group.label}>
                    <button
                      onClick={() => toggleSection(group.label)}
                      className="flex items-center justify-between w-full px-3 py-1 group"
                      aria-expanded={!isSectionCollapsed}
                    >
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
                          isSectionCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </button>
                    {!isSectionCollapsed && (
                      <ul className="mt-1 space-y-0.5 animate-sidebar-expand">
                        {group.items.map(renderNavItem)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t dark:border-gray-700 p-2">
          {/* Can add version info or additional actions here */}
        </div>
      </nav>
    </TooltipProvider>
  );
}
