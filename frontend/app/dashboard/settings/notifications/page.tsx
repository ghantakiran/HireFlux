'use client';

/**
 * Notification Settings Page
 * Issue #130: Notification Center (In-App)
 *
 * Allows users to configure notification preferences including:
 * - In-app notifications by type
 * - Email notifications with digest options
 * - Browser push notifications
 * - Sound notifications
 */

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Monitor, Volume2, VolumeX, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NotificationPreferences, NotificationType } from '@/lib/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_TYPE_CONFIG } from '@/lib/types/notifications';

const NOTIFICATION_TYPES: NotificationType[] = [
  'application',
  'message',
  'interview',
  'offer',
  'system',
  'reminder',
];

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notification-preferences');
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    // Check browser notification permission
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Handle in-app toggle
  const handleInAppToggle = (checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      inApp: { ...prev.inApp, enabled: checked },
    }));
  };

  // Handle in-app type toggle
  const handleInAppTypeToggle = (type: NotificationType, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      inApp: {
        ...prev.inApp,
        types: { ...prev.inApp.types, [type]: checked },
      },
    }));
  };

  // Handle email toggle
  const handleEmailToggle = (checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      email: { ...prev.email, enabled: checked },
    }));
  };

  // Handle email type toggle
  const handleEmailTypeToggle = (type: NotificationType, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        types: { ...prev.email.types, [type]: checked },
      },
    }));
  };

  // Handle email digest change
  const handleDigestChange = (value: string) => {
    setPreferences((prev) => ({
      ...prev,
      email: { ...prev.email, digest: value as 'instant' | 'hourly' | 'daily' | 'weekly' },
    }));
  };

  // Handle browser toggle
  const handleBrowserToggle = async (checked: boolean) => {
    if (checked && browserPermission === 'default') {
      // Request permission
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      setPreferences((prev) => ({
        ...prev,
        browser: { enabled: permission === 'granted', permission },
      }));
    } else {
      setPreferences((prev) => ({
        ...prev,
        browser: { ...prev.browser, enabled: checked },
      }));
    }
  };

  // Handle sound toggle
  const handleSoundToggle = (checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      sound: { ...prev.sound, enabled: checked },
    }));
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setPreferences((prev) => ({
      ...prev,
      sound: { ...prev.sound, volume: value[0] },
    }));
  };

  // Save preferences
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Save to localStorage
      localStorage.setItem('notification-preferences', JSON.stringify(preferences));

      // Show success toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Customize how you receive notifications from HireFlux
        </p>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          data-toast
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg animate-in slide-in-from-top"
        >
          <Check className="h-4 w-4" />
          <span>Preferences saved successfully</span>
        </div>
      )}

      <div className="space-y-6">
        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>In-App Notifications</CardTitle>
                <CardDescription>
                  Notifications shown in the app notification center
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="in-app-toggle" className="font-medium">
                Enable in-app notifications
              </Label>
              <Switch
                id="in-app-toggle"
                data-pref="in-app"
                checked={preferences.inApp.enabled}
                onCheckedChange={handleInAppToggle}
              />
            </div>

            {preferences.inApp.enabled && (
              <div className="pl-4 border-l-2 border-gray-200 space-y-3 mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Choose which types of notifications to receive:
                </p>
                {NOTIFICATION_TYPES.map((type) => (
                  <div
                    key={type}
                    data-pref-type={type}
                    className="flex items-center justify-between"
                  >
                    <Label htmlFor={`inapp-${type}`} className="text-sm">
                      {NOTIFICATION_TYPE_CONFIG[type].label}
                    </Label>
                    <Switch
                      id={`inapp-${type}`}
                      checked={preferences.inApp.types[type]}
                      onCheckedChange={(checked) => handleInAppTypeToggle(type, checked)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Receive notifications via email
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-toggle" className="font-medium">
                Enable email notifications
              </Label>
              <Switch
                id="email-toggle"
                data-pref="email"
                checked={preferences.email.enabled}
                onCheckedChange={handleEmailToggle}
              />
            </div>

            {preferences.email.enabled && (
              <>
                <div className="pl-4 border-l-2 border-gray-200 space-y-3 mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Choose which types of notifications to receive via email:
                  </p>
                  {NOTIFICATION_TYPES.map((type) => (
                    <div key={type} className="flex items-center justify-between">
                      <Label htmlFor={`email-${type}`} className="text-sm">
                        {NOTIFICATION_TYPE_CONFIG[type].label}
                      </Label>
                      <Switch
                        id={`email-${type}`}
                        checked={preferences.email.types[type]}
                        onCheckedChange={(checked) => handleEmailTypeToggle(type, checked)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <Label htmlFor="digest-select" className="text-sm font-medium mb-2 block">
                    Email Digest Frequency
                  </Label>
                  <Select
                    value={preferences.email.digest}
                    onValueChange={handleDigestChange}
                  >
                    <SelectTrigger id="digest-select" className="w-full">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="hourly">Hourly Digest</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Browser Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-purple-600" />
              <div>
                <CardTitle>Browser Notifications</CardTitle>
                <CardDescription>
                  Receive push notifications in your browser
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="browser-toggle" className="font-medium">
                  Enable browser notifications
                </Label>
                {browserPermission === 'denied' && (
                  <p className="text-xs text-red-500 mt-1">
                    Permission denied. Please enable notifications in your browser settings.
                  </p>
                )}
              </div>
              <Switch
                id="browser-toggle"
                data-pref="browser"
                checked={preferences.browser.enabled}
                onCheckedChange={handleBrowserToggle}
                disabled={browserPermission === 'denied'}
              />
            </div>

            {browserPermission === 'granted' && preferences.browser.enabled && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Browser notifications are enabled
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sound Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {preferences.sound.enabled ? (
                <Volume2 className="h-5 w-5 text-orange-600" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <CardTitle>Sound Notifications</CardTitle>
                <CardDescription>
                  Play a sound when you receive a notification
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-toggle" className="font-medium">
                Enable notification sounds
              </Label>
              <Switch
                id="sound-toggle"
                data-pref="sound"
                checked={preferences.sound.enabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>

            {preferences.sound.enabled && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-3 block">
                  Volume: {preferences.sound.volume}%
                </Label>
                <Slider
                  value={[preferences.sound.volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  min={0}
                  step={10}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            data-save-preferences
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
