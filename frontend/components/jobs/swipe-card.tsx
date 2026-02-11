'use client';

/**
 * Swipe Card Component
 * Issue #141: Individual job card with swipe gestures
 *
 * Features:
 * - Touch and mouse gesture detection
 * - Physics-based animations
 * - Swipe overlays (like, pass, super)
 * - Spring snap-back effect
 * - 60 FPS performance
 */

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { MapPin, DollarSign, TrendingUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Job } from '@/lib/types/jobs';

interface SwipeCardProps {
  job: Job;
  index: number;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  onViewDetails?: () => void;
  isTop: boolean;
}

const SWIPE_THRESHOLD = 120; // px to trigger swipe
const VERTICAL_THRESHOLD = 150; // px to trigger super like

export function SwipeCard({ job, index, onSwipe, onViewDetails, isTop }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Animation state
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Handle touch/mouse start
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!isTop) return;

    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  // Handle touch/mouse move
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    setDragOffset({ x: deltaX, y: deltaY });

    // Determine swipe direction
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -50) {
      setSwipeDirection('up');
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  };

  // Handle touch/mouse end
  const handleDragEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);

    // Check if swipe threshold met
    if (absY > absX && dragOffset.y < -VERTICAL_THRESHOLD) {
      // Swipe up (super like)
      setIsExiting(true);
      setExitDirection('up');
      setTimeout(() => onSwipe('up'), 300);
    } else if (absX > SWIPE_THRESHOLD && absX > absY) {
      // Swipe left or right
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      setIsExiting(true);
      setExitDirection(direction);
      setTimeout(() => onSwipe(direction), 300);
    } else {
      // Snap back
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Global mouse move/up listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, dragOffset]);

  // Calculate transform
  const getTransform = () => {
    if (isExiting && exitDirection) {
      // Exit animation
      if (exitDirection === 'up') {
        return `translateY(-120vh) rotate(0deg) scale(0.8)`;
      } else if (exitDirection === 'left') {
        return `translateX(-120vw) rotate(-30deg) scale(0.8)`;
      } else {
        return `translateX(120vw) rotate(30deg) scale(0.8)`;
      }
    }

    if (isDragging) {
      // Dragging
      const rotation = dragOffset.x / 20;
      const scale = 1 + Math.abs(dragOffset.x) / 5000;
      return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg) scale(${Math.min(scale, 1.05)})`;
    }

    // Stacked card position
    if (index === 0) {
      return 'translate(0, 0) scale(1)';
    } else if (index === 1) {
      return 'translate(0, 10px) scale(0.95)';
    } else {
      return 'translate(0, 20px) scale(0.9)';
    }
  };

  // Calculate opacity for overlays
  const getOverlayOpacity = (type: 'like' | 'pass' | 'super') => {
    if (!isDragging) return 0;

    if (type === 'super' && swipeDirection === 'up') {
      return Math.min(Math.abs(dragOffset.y) / VERTICAL_THRESHOLD, 1);
    } else if (type === 'like' && swipeDirection === 'right') {
      return Math.min(dragOffset.x / SWIPE_THRESHOLD, 1);
    } else if (type === 'pass' && swipeDirection === 'left') {
      return Math.min(Math.abs(dragOffset.x) / SWIPE_THRESHOLD, 1);
    }

    return 0;
  };

  // Handle card click (view details)
  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging || !isTop || !onViewDetails) return;

    // Only trigger if it's a quick tap (not a swipe)
    onViewDetails();
  };

  return (
    <div
      ref={cardRef}
      data-job-card
      data-card-index={index}
      data-swiping={swipeDirection}
      className={`
        absolute inset-0 rounded-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden
        cursor-grab active:cursor-grabbing
        select-none
        ${isExiting ? 'transition-transform duration-300 ease-out' : ''}
        ${!isDragging && !isExiting ? 'transition-transform duration-200 ease-out' : ''}
      `}
      style={{
        transform: getTransform(),
        zIndex: 10 - index,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleCardClick}
    >
      {/* Background Image/Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-10" />

      {/* Swipe Overlays */}
      {isTop && (
        <>
          {/* Like Overlay (Right) */}
          <div
            data-swipe-overlay="like"
            className="absolute inset-0 bg-green-500/90 flex items-center justify-center transition-opacity duration-75"
            style={{ opacity: getOverlayOpacity('like') }}
          >
            <div className="text-white text-6xl font-bold rotate-12 border-8 border-white rounded-2xl px-8 py-4">
              LIKE
            </div>
          </div>

          {/* Pass Overlay (Left) */}
          <div
            data-swipe-overlay="reject"
            className="absolute inset-0 bg-red-500/90 flex items-center justify-center transition-opacity duration-75"
            style={{ opacity: getOverlayOpacity('pass') }}
          >
            <div className="text-white text-6xl font-bold -rotate-12 border-8 border-white rounded-2xl px-8 py-4">
              PASS
            </div>
          </div>

          {/* Super Like Overlay (Up) */}
          <div
            data-swipe-overlay="super"
            className="absolute inset-0 bg-blue-500/90 flex items-center justify-center transition-opacity duration-75"
            style={{ opacity: getOverlayOpacity('super') }}
          >
            <div className="text-white text-6xl font-bold border-8 border-white rounded-2xl px-8 py-4">
              SUPER
            </div>
          </div>
        </>
      )}

      {/* Card Content */}
      <div className="relative h-full flex flex-col p-6">
        {/* Company Logo */}
        <div className="mb-4">
          <div
            data-company-logo
            className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden relative"
          >
            {job.logo ? (
              <Image
                src={job.logo}
                alt={job.company}
                fill
                sizes="64px"
                className="object-cover"
                loading="eager"
                quality={85}
              />
            ) : (
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">{job.company[0]}</span>
            )}
          </div>
        </div>

        {/* Job Title */}
        <h2 data-job-title className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
          {job.title}
        </h2>

        {/* Company Name */}
        <p data-company-name className="text-lg text-gray-700 dark:text-gray-300 mb-4">
          {job.company}
        </p>

        {/* Location */}
        <div data-job-location className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{job.location}</span>
        </div>

        {/* Salary Range */}
        {job.salary && (
          <div data-salary-range className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-4">
            <DollarSign className="h-5 w-5" />
            <span>
              ${(job.salary.min / 1000).toFixed(0)}k - ${(job.salary.max / 1000).toFixed(0)}k {job.salary.currency}
            </span>
          </div>
        )}

        {/* Fit Index */}
        <div data-fit-index className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-lg font-bold text-green-600 dark:text-green-400">{job.fitIndex}% Match</span>
        </div>

        {/* Tags */}
        <div data-job-tags className="flex flex-wrap gap-2 mb-6">
          {job.tags.map((tag) => (
            <Badge key={tag} data-tag variant="secondary" className="px-3 py-1">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Details Button */}
        {isTop && onViewDetails && (
          <Button
            data-view-details
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            variant="outline"
            className="w-full h-12 text-base font-semibold"
          >
            <Eye className="h-5 w-5 mr-2" />
            View Details
          </Button>
        )}
      </div>
    </div>
  );
}
