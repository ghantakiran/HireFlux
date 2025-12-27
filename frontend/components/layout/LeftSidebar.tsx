'use client';

import { useState, useEffect } from 'react';
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

const JOB_SEEKER_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, dataAttr: 'dashboard' },
  { name: 'Job Search', href: '/jobs', icon: Search, dataAttr: 'job-search' },
  { name: 'Applications', href: '/dashboard/applications', icon: Target, dataAttr: 'applications' },
  { name: 'Resumes', href: '/dashboard/resumes', icon: FileText, dataAttr: 'resumes' },
  { name: 'Cover Letters', href: '/dashboard/cover-letters', icon: Mail, dataAttr: 'cover-letters' },
  { name: 'Interview Prep', href: '/dashboard/interview-prep', icon: Video, dataAttr: 'interview-prep' },
  { name: 'Profile', href: '/settings/profile', icon: User, dataAttr: 'profile' },
];

const EMPLOYER_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard, dataAttr: 'dashboard' },
  { name: 'Jobs', href: '/employer/jobs', icon: Briefcase, dataAttr: 'jobs' },
  { name: 'Candidates', href: '/employer/candidates', icon: Users, dataAttr: 'candidates' },
  { name: 'Applications', href: '/employer/applications', icon: Target, dataAttr: 'applications' },
  { name: 'Team', href: '/employer/team', icon: Users, dataAttr: 'team' },
  { name: 'Analytics', href: '/employer/analytics', icon: BarChart3, dataAttr: 'analytics' },
  { name: 'Company Profile', href: '/employer/company', icon: Building, dataAttr: 'company-profile' },
];

interface LeftSidebarProps {
  role?: 'job_seeker' | 'employer';
}

export function LeftSidebar({ role = 'job_seeker' }: LeftSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = role === 'employer' ? EMPLOYER_NAV : JOB_SEEKER_NAV;

  // Persist collapse state in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setCollapsed(savedState === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/employer/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ${
          collapsed ? 'lg:w-16' : 'lg:w-60'
        } border-r border-gray-200 bg-white`}
        data-left-sidebar
        style={{ width: collapsed ? '64px' : '240px' }}
      >
        {/* Collapse Button */}
        <div className="flex h-16 items-center justify-end px-2 border-b">
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
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
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
            })}
          </ul>
        </div>

        {/* Footer (if needed for additional actions) */}
        <div className="border-t p-2">
          {/* Can add version info or additional actions here */}
        </div>
      </nav>
    </TooltipProvider>
  );
}
