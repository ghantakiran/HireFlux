'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Settings, User, Bell, CreditCard, Coins } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: 'Profile', href: '/dashboard/settings', icon: User },
    { label: 'Profile Settings', href: '/dashboard/settings/profile', icon: User },
    { label: 'Subscription', href: '/dashboard/settings/subscription', icon: CreditCard },
    { label: 'Credits', href: '/dashboard/settings/credits', icon: Coins },
    { label: 'Notifications', href: '/dashboard/settings/notifications', icon: Bell },
    { label: 'Preferences', href: '/dashboard/settings/preferences', icon: Settings },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard/settings') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and subscription
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Button
                      key={item.href}
                      variant={active ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => handleNavigation(item.href)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Use the navigation menu on the left to access different settings sections.
                Click <strong>Subscription</strong> to manage your billing or <strong>Credits</strong> to purchase and view credit usage.
              </p>
            </CardContent>
          </Card>

          {/* Quick Links Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {menuItems.slice(1).map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.href}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleNavigation(item.href)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.label === 'Subscription' && 'Manage your plan and billing'}
                          {item.label === 'Credits' && 'View and purchase credits'}
                          {item.label === 'Notifications' && 'Configure notification preferences'}
                          {item.label === 'Preferences' && 'Customize your experience'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Profile Settings */}
          {/* TODO: Implement profile editing with user store */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Profile editing will be implemented with user authentication integration.
              </p>
              <Button disabled>Save Changes (Coming Soon)</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
