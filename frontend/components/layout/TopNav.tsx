'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  Search,
  Bell,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown
} from 'lucide-react';
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

interface TopNavProps {
  role?: 'job_seeker' | 'employer';
}

export function TopNav({ role = 'job_seeker' }: TopNavProps) {
  const { user, logout } = useAuthStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock notifications (replace with real data)
  const notifications = [
    { id: 1, type: 'application', message: 'Application status updated', read: false },
    { id: 2, type: 'message', message: 'New message from recruiter', read: false },
    { id: 3, type: 'interview', message: 'Interview scheduled for tomorrow', read: false },
    { id: 4, type: 'job_match', message: '5 new jobs match your profile', read: true },
    { id: 5, type: 'application', message: 'Application submitted successfully', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

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
            {/* Notifications Dropdown */}
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  data-notifications-icon
                  aria-haspopup="true"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      data-notifications-badge
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80"
                data-notifications-dropdown
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span data-unread-count>{unreadCount} unread notifications</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    data-mark-all-read
                  >
                    Mark all as read
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex items-start gap-3 py-3"
                      data-notification-item
                      data-read={notification.read}
                      data-notification-type={notification.type}
                    >
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" data-unread-dot />
                      )}
                      <div className="flex-1">
                        <p className={notification.read ? 'text-gray-600' : 'text-gray-900'}>
                          {notification.message}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Menu */}
            <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  data-profile-menu-trigger
                  aria-haspopup="true"
                  aria-expanded={profileMenuOpen}
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
                <DropdownMenuItem asChild data-menu-profile-settings>
                  <Link href="/settings/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-menu-billing>
                  <Link href="/settings/billing" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild data-menu-help>
                  <Link href="/help" className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </Link>
                </DropdownMenuItem>
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
