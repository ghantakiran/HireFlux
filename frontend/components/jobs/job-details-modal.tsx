'use client';

/**
 * Job Details Modal
 * Issue #141: Full job details view in modal
 */

import React from 'react';
import Image from 'next/image';
import { X, MapPin, DollarSign, Clock, Building, Heart, Ban, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Job } from '@/lib/types/jobs';

interface JobDetailsModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onSave: () => void;
  onPass: () => void;
}

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onApply,
  onSave,
  onPass,
}: JobDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-job-details-modal
        className="fixed inset-0 z-50 w-full h-full max-w-none m-0 p-0 rounded-none bg-white dark:bg-gray-900 overflow-y-auto"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        }}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Job Details</h1>
          <Button
            data-modal-close
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Company Logo */}
          <div className="flex items-center gap-4">
            <div
              data-company-logo
              className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 relative"
            >
              {job.logo ? (
                <Image
                  src={job.logo}
                  alt={job.company}
                  fill
                  sizes="80px"
                  className="object-cover"
                  loading="eager"
                  quality={85}
                />
              ) : (
                <span className="text-3xl font-bold text-gray-600 dark:text-gray-400">{job.company[0]}</span>
              )}
            </div>
            <div>
              <h2 data-job-title className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {job.title}
              </h2>
              <p data-company-name className="text-lg text-gray-700 dark:text-gray-300">
                {job.company}
              </p>
            </div>
          </div>

          {/* Key Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{job.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Building className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm capitalize">{job.type}</span>
            </div>
            {job.salary && (
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold col-span-2">
                <DollarSign className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">
                  ${(job.salary.min / 1000).toFixed(0)}k - ${(job.salary.max / 1000).toFixed(0)}k {job.salary.currency}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 col-span-2">
              <Clock className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">
                Posted {formatDate(job.postedAt)}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="px-3 py-1">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Fit Index */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Fit Score</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{job.fitIndex}% Match</p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Based on your skills and experience
            </p>
          </div>

          {/* Job Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">About the Role</h3>
            <p data-job-description className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {job.description}
            </p>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Requirements</h3>
            <ul data-requirements className="space-y-2">
              {job.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-3"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          }}
        >
          <Button
            data-modal-apply
            onClick={() => {
              onClose();
              onApply();
            }}
            className="w-full h-12 text-base font-semibold"
          >
            <Send className="h-5 w-5 mr-2" />
            Apply Now
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              data-modal-save
              onClick={() => {
                onSave();
                onClose();
              }}
              variant="outline"
              className="h-12"
            >
              <Heart className="h-5 w-5 mr-2" />
              Save
            </Button>
            <Button
              data-modal-pass
              onClick={() => {
                onPass();
                onClose();
              }}
              variant="outline"
              className="h-12"
            >
              <Ban className="h-5 w-5 mr-2" />
              Pass
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
