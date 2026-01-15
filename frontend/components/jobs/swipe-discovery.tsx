'use client';

/**
 * Swipe Discovery Component
 * Issue #141: Mobile Job Discovery (Swipe Cards)
 *
 * Tinder-style job discovery interface with swipe gestures
 * - Swipe right (like/save)
 * - Swipe left (pass/reject)
 * - Swipe up (super like/quick apply)
 * - Undo last action
 * - Physics-based animations
 * - Mobile-only interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Heart, Star, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SwipeCard } from './swipe-card';
import { JobDetailsModal } from './job-details-modal';
import { FiltersSheet } from './filters-sheet';
import { MobileApplyModal } from '../applications/mobile-apply-modal';
import type { Job } from '@/lib/types/jobs';

// Mock jobs (TODO: Replace with API)
const MOCK_JOBS: Job[] = Array.from({ length: 25 }, (_, i) => ({
  id: `job-${i + 1}`,
  title: `${['Senior', 'Lead', 'Staff', 'Principal'][i % 4]} Software Engineer`,
  company: `${['TechCorp', 'InnovateLabs', 'CloudSystems', 'DataFlow'][i % 4]}`,
  location: `${['San Francisco, CA', 'New York, NY', 'Remote', 'Austin, TX'][i % 4]}`,
  type: 'full-time',
  salary: {
    min: 120000 + i * 10000,
    max: 180000 + i * 10000,
    currency: 'USD',
  },
  tags: ['Remote', 'Visa Sponsorship', 'Health Insurance'].slice(0, Math.floor(Math.random() * 3) + 1),
  fitIndex: 70 + Math.floor(Math.random() * 30),
  logo: `/companies/company-${(i % 4) + 1}.png`,
  description: 'Exciting opportunity to work on cutting-edge technology...',
  requirements: ['5+ years experience', 'React expertise', 'TypeScript'],
  postedAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

interface SwipeAction {
  jobId: string;
  action: 'like' | 'pass' | 'super';
  timestamp: number;
}

export function SwipeDiscovery() {
  // Jobs state
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<SwipeAction[]>([]);

  // UI state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeFilters, setActiveFilters] = useState(0);

  // Saved jobs
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  // Load saved jobs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedJobs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedJobs(parsed.map((job: any) => job.id || job));
      } catch (error) {
        console.error('Error loading saved jobs:', error);
      }
    }
  }, []);

  // Check if mobile device
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Current visible jobs (top 3 cards)
  const visibleJobs = jobs.slice(currentIndex, currentIndex + 3);
  const currentJob = visibleJobs[0];

  // Handle swipe action
  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up', jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    let action: 'like' | 'pass' | 'super';

    if (direction === 'left') {
      // Pass
      action = 'pass';
    } else if (direction === 'right') {
      // Like - save to localStorage
      action = 'like';
      const newSavedJobs = [...savedJobs, jobId];
      setSavedJobs(newSavedJobs);
      localStorage.setItem('savedJobs', JSON.stringify(newSavedJobs.map(id => ({ id }))));

      // Show toast
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(`${job.title} saved!`);
      }
    } else {
      // Super like - open quick apply
      action = 'super';
      setSelectedJob(job);
      setIsApplyOpen(true);
    }

    // Add to history
    setHistory((prev) => [...prev, { jobId, action, timestamp: Date.now() }]);

    // Move to next card
    setCurrentIndex((prev) => prev + 1);

    // Preload more jobs if needed
    if (currentIndex + 5 >= jobs.length) {
      // TODO: Load more jobs from API
      console.log('Loading more jobs...');
    }
  }, [jobs, currentIndex, savedJobs]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (history.length === 0 || currentIndex === 0) return;

    const lastAction = history[history.length - 1];

    // Remove from saved jobs if it was a like
    if (lastAction.action === 'like') {
      const newSavedJobs = savedJobs.filter((id) => id !== lastAction.jobId);
      setSavedJobs(newSavedJobs);
      localStorage.setItem('savedJobs', JSON.stringify(newSavedJobs.map(id => ({ id }))));
    }

    // Remove from history
    setHistory((prev) => prev.slice(0, -1));

    // Go back one card
    setCurrentIndex((prev) => prev - 1);
  }, [history, currentIndex, savedJobs]);

  // Handle button actions
  const handlePass = () => {
    if (!currentJob) return;
    handleSwipe('left', currentJob.id);
  };

  const handleLike = () => {
    if (!currentJob) return;
    handleSwipe('right', currentJob.id);
  };

  const handleSuperLike = () => {
    if (!currentJob) return;
    handleSwipe('up', currentJob.id);
  };

  // Handle view details
  const handleViewDetails = () => {
    setSelectedJob(currentJob);
    setIsDetailsOpen(true);
  };

  // Desktop fallback
  if (!isMobile) {
    return (
      <div data-mobile-only-message className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mobile Only</h1>
          <p className="text-gray-600 mb-6">
            The swipe interface is optimized for mobile devices. Please visit on your phone or use the desktop view.
          </p>
          <Button
            onClick={() => (window.location.href = '/jobs')}
            className="w-full"
          >
            View Jobs (Desktop)
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (currentIndex >= jobs.length) {
    return (
      <div data-empty-state className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">All Done!</h1>
          <p data-empty-message className="text-gray-600 mb-6">
            You've reviewed all available jobs. Check back later for more opportunities!
          </p>
          <div className="space-y-3">
            <Button
              data-adjust-filters
              onClick={() => setIsFiltersOpen(true)}
              variant="outline"
              className="w-full"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Adjust Filters
            </Button>
            <Button
              data-view-saved
              onClick={() => (window.location.href = '/jobs/saved')}
              className="w-full"
            >
              View Saved Jobs ({savedJobs.length})
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        data-swipe-container
        className="relative h-screen w-full bg-gray-50 overflow-hidden"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
        }}
      >
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-white to-transparent">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Discover</h1>
            <span data-card-count className="text-sm text-gray-600">
              {currentIndex + 1} of {jobs.length}
            </span>
          </div>

          <Button
            data-filters-button
            onClick={() => setIsFiltersOpen(true)}
            variant="outline"
            size="sm"
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
        </header>

        {/* Card Stack */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-32">
          <div className="relative w-full max-w-md h-full">
            {visibleJobs.map((job, index) => (
              <SwipeCard
                key={job.id}
                job={job}
                index={index}
                onSwipe={(direction) => handleSwipe(direction, job.id)}
                onViewDetails={index === 0 ? handleViewDetails : undefined}
                isTop={index === 0}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-6 bg-gradient-to-t from-white to-transparent">
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            {/* Pass Button */}
            <Button
              data-action-pass
              onClick={handlePass}
              disabled={!currentJob}
              variant="outline"
              size="lg"
              className="w-16 h-16 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 active:scale-95 transition-transform"
              aria-label="Pass on this job"
            >
              <X className="h-7 w-7" />
            </Button>

            {/* Undo Button */}
            <Button
              data-undo-button
              onClick={handleUndo}
              disabled={history.length === 0}
              variant="outline"
              size="lg"
              className="w-12 h-12 rounded-full border-2 border-gray-300 text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform disabled:opacity-30"
              aria-label={`Undo ${history.length > 0 ? `(${history.length})` : ''}`}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>

            {/* Like Button */}
            <Button
              data-action-like
              onClick={handleLike}
              disabled={!currentJob}
              variant="outline"
              size="lg"
              className="w-16 h-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-50 active:scale-95 transition-transform"
              aria-label="Save this job"
            >
              <Heart className="h-7 w-7" />
            </Button>

            {/* Super Like Button */}
            <Button
              data-action-super
              onClick={handleSuperLike}
              disabled={!currentJob}
              variant="outline"
              size="lg"
              className="w-12 h-12 rounded-full border-2 border-blue-500 text-blue-500 hover:bg-blue-50 active:scale-95 transition-transform"
              aria-label="Quick apply to this job"
            >
              <Star className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Live region for screen readers */}
        <div role="status" aria-live="polite" className="sr-only">
          {history.length > 0 && history[history.length - 1].action === 'like' && 'Job saved'}
          {history.length > 0 && history[history.length - 1].action === 'pass' && 'Job passed'}
          {history.length > 0 && history[history.length - 1].action === 'super' && 'Opening quick apply'}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedJob(null);
          }}
          onApply={() => {
            setIsDetailsOpen(false);
            setIsApplyOpen(true);
          }}
          onSave={() => handleLike()}
          onPass={() => handlePass()}
        />
      )}

      {/* Filters Sheet */}
      <FiltersSheet
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        onApply={(count) => {
          setActiveFilters(count);
          setIsFiltersOpen(false);
          // TODO: Reload jobs with filters
        }}
      />

      {/* Quick Apply Modal */}
      {selectedJob && (
        <MobileApplyModal
          isOpen={isApplyOpen}
          onClose={() => {
            setIsApplyOpen(false);
            setSelectedJob(null);
          }}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          companyName={selectedJob.company}
          location={selectedJob.location}
        />
      )}
    </>
  );
}
