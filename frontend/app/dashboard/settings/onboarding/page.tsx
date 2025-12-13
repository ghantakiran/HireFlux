/**
 * Onboarding Settings Page
 * Manage tours, tooltips, and onboarding preferences
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Settings,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useTour } from '@/components/tours/tour-provider';
import { tourRegistry } from '@/lib/tours/tour-registry';
import { TourConfig, TourProgress } from '@/lib/tours/types';
import { toast } from 'sonner';

export default function OnboardingSettingsPage() {
  const {
    startTour,
    getTourProgress,
    getAllProgress,
    resetTour,
    resetAllTours,
    settings,
    updateSettings,
  } = useTour();

  const [allTours, setAllTours] = useState<TourConfig[]>([]);
  const [tourProgress, setTourProgress] = useState<Map<string, TourProgress>>(new Map());
  const [stats, setStats] = useState({
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    skipped: 0,
    lastCompleted: null as string | null,
  });

  // Load tours and progress
  useEffect(() => {
    const tours = tourRegistry.getAllTours();
    setAllTours(tours);

    const progress = getAllProgress();
    const progressMap = new Map<string, TourProgress>();
    progress.forEach((p) => progressMap.set(p.tourId, p));
    setTourProgress(progressMap);

    // Calculate stats
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    let skipped = 0;
    let lastCompletedDate: string | null = null;

    tours.forEach((tour) => {
      const p = progressMap.get(tour.id);
      if (!p) {
        notStarted++;
      } else {
        switch (p.status) {
          case 'completed':
            completed++;
            if (p.completedAt && (!lastCompletedDate || p.completedAt > lastCompletedDate)) {
              lastCompletedDate = p.completedAt;
            }
            break;
          case 'in-progress':
            inProgress++;
            break;
          case 'skipped':
            skipped++;
            break;
          default:
            notStarted++;
        }
      }
    });

    setStats({
      completed,
      inProgress,
      notStarted,
      skipped,
      lastCompleted: lastCompletedDate,
    });
  }, [getAllProgress]);

  const getTourStatus = (tourId: string) => {
    const progress = tourProgress.get(tourId);
    if (!progress) return 'not-started';
    return progress.status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'skipped':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Not Started';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleStartTour = (tourId: string) => {
    startTour(tourId);
    toast.success('Tour started!');
  };

  const handleResumeTour = (tourId: string) => {
    const progress = tourProgress.get(tourId);
    if (progress) {
      startTour(tourId, progress.currentStep);
      toast.success('Resuming tour from where you left off');
    }
  };

  const handleResetTour = (tourId: string) => {
    resetTour(tourId);
    toast.success('Tour reset! You can start it again.');
    // Refresh progress
    window.location.reload();
  };

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all tours? This will clear your progress.')) {
      resetAllTours();
      toast.success('All tours reset!');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboarding & Tours</h1>
          <p className="text-gray-600">
            Manage your guided tours and onboarding preferences
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Not Started</p>
                <p className="text-2xl font-bold text-gray-600">{stats.notStarted}</p>
              </div>
              <Circle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Completed</p>
                <p className="text-sm font-medium text-gray-900">
                  {stats.lastCompleted
                    ? new Date(stats.lastCompleted).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
        </div>

        {/* Settings */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Tour Settings</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="tooltips-enabled" className="text-base font-medium">
                  Enable Contextual Tooltips
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Show helpful tooltips when hovering over UI elements
                </p>
              </div>
              <Switch
                id="tooltips-enabled"
                checked={settings.tooltipsEnabled}
                onCheckedChange={(checked) =>
                  updateSettings({ tooltipsEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="show-beacons" className="text-base font-medium">
                  Show Tour Beacons
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Display visual indicators for elements with available tours
                </p>
              </div>
              <Switch
                id="show-beacons"
                checked={settings.showBeacons}
                onCheckedChange={(checked) => updateSettings({ showBeacons: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="auto-start" className="text-base font-medium">
                  Auto-Start Tours
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically start tours on your first visit to new pages
                </p>
              </div>
              <Switch
                id="auto-start"
                checked={settings.autoStartTours}
                onCheckedChange={(checked) =>
                  updateSettings({ autoStartTours: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="confirm-dismissal" className="text-base font-medium">
                  Confirm First Dismissal
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Ask for confirmation before dismissing your first tour
                </p>
              </div>
              <Switch
                id="confirm-dismissal"
                checked={settings.confirmFirstDismissal}
                onCheckedChange={(checked) =>
                  updateSettings({ confirmFirstDismissal: checked })
                }
              />
            </div>

            <div>
              <Label htmlFor="animation-speed" className="text-base font-medium">
                Animation Speed
              </Label>
              <p className="text-sm text-gray-600 mt-1 mb-3">
                Control the speed of tour animations and transitions
              </p>
              <select
                id="animation-speed"
                value={settings.animationSpeed}
                onChange={(e) =>
                  updateSettings({
                    animationSpeed: e.target.value as 'slow' | 'normal' | 'fast' | 'none',
                  })
                }
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
                <option value="none">No Animation (Accessibility)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="tooltip-delay" className="text-base font-medium">
                Tooltip Hover Delay
              </Label>
              <p className="text-sm text-gray-600 mt-1 mb-3">
                Time before tooltips appear on hover (in milliseconds)
              </p>
              <input
                id="tooltip-delay"
                type="number"
                min="0"
                max="2000"
                step="100"
                value={settings.tooltipDelay}
                onChange={(e) =>
                  updateSettings({ tooltipDelay: parseInt(e.target.value) })
                }
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </Card>

        {/* Tours List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Available Tours</h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All Tours
            </Button>
          </div>

          <div className="space-y-4">
            {allTours.map((tour) => {
              const status = getTourStatus(tour.id);
              const progress = tourProgress.get(tour.id);

              return (
                <div
                  key={tour.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {tour.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(
                              status
                            )}`}
                          >
                            {getStatusText(status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{tour.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{tour.steps.length} steps</span>
                          <span>~{Math.ceil(tour.steps.length / 2)} minutes</span>
                          {progress && progress.currentStep > 0 && (
                            <span>
                              Step {progress.currentStep + 1} of {tour.steps.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {status === 'not-started' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartTour(tour.id)}
                          data-testid={`start-tour-${tour.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start Tour
                        </Button>
                      )}

                      {status === 'in-progress' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleResumeTour(tour.id)}
                            data-testid={`resume-tour-${tour.id}`}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetTour(tour.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset
                          </Button>
                        </>
                      )}

                      {(status === 'completed' || status === 'skipped') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStartTour(tour.id)}
                            data-testid={`replay-tour-${tour.id}`}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Replay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetTour(tour.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">Need Help?</p>
              <p className="text-sm text-blue-800">
                Tours help you discover features and learn how to use the platform. You can
                start, pause, or replay any tour at any time. Tooltips provide quick help
                without interrupting your workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
