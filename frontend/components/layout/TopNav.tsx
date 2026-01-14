'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  Search,
  User,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { NotificationButton } from '@/components/notifications/notification-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface TopNavProps {
  role?: 'job_seeker' | 'employer';
}

export function TopNav({ role = 'job_seeker' }: TopNavProps) {
  const { user, logout } = useAuthStore();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results
      window.location.href = role === 'job_seeker'
        ? `/jobs?q=${encodeURIComponent(searchQuery)}`
        : `/employer/candidates?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/login';
  };

  const searchPlaceholder = role === 'job_seeker'
    ? 'Search jobs, companies...'
    : 'Search candidates, applications...';

  return (
    <>
      <header
        role="banner"
        aria-label="Main navigation"
        className="sticky top-0 z-40 h-16 border-b border-gray-200 bg-white shadow-sm"
        data-top-nav
      >
        <div className="flex h-full items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href={role === 'employer' ? '/employer/dashboard' : '/dashboard'}
            className="flex items-center"
            data-logo
            tabIndex={0}
          >
            <span className="text-2xl font-bold text-blue-600">HireFlux</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md" data-search-bar>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
                data-search-input
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications - Issue #130 */}
            <NotificationButton />

            {/* Profile Menu */}
            <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  data-profile-menu-trigger
                  aria-label="Profile menu"
                  aria-haspopup="true"
                  aria-expanded={profileMenuOpen}
                  tabIndex={0}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" data-profile-menu>
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-menu-profile-settings>
                  <Link href="/settings/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem data-menu-billing>
                  <Link href="/settings/billing" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem data-menu-help>
                  <Link href="/help" className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <ThemeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSignOutDialogOpen(true)}
                  className="text-red-600 focus:text-red-600"
                  data-menu-sign-out
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent data-sign-out-confirm>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              data-confirm-sign-out-button
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
