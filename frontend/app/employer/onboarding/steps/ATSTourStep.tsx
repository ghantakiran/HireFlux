/**
 * Onboarding Step 4: ATS Introduction Tour (Issue #112)
 *
 * Interactive product tour of ATS features
 * - 6 tour steps (Dashboard, Applications, Pipeline, Ranking, Scheduling, Collaboration)
 * - Next/Back/Skip navigation
 * - Tour replay option
 * - Skip option
 */

'use client';

import React, { useState } from 'react';
import { LayoutDashboard, Inbox, GitBranch, Star, Calendar, MessageSquare, ChevronLeft, ChevronRight, SkipForward, PlayCircle } from 'lucide-react';

interface ATSTourStepProps {
  onContinue: (data: any) => void;
  onSkip: () => void;
  onSaveAndExit: () => void;
  savedData: any;
}

const TOUR_STEPS = [
  {
    id: 1,
    icon: LayoutDashboard,
    title: 'Dashboard Overview',
    description: 'Your central hub for tracking all hiring metrics, active jobs, and recent applications. Get real-time insights into your recruiting pipeline.',
    features: ['Active job listings', 'Application trends', 'Quick actions', 'Performance metrics'],
  },
  {
    id: 2,
    icon: Inbox,
    title: 'Application Management',
    description: 'View and manage all job applications in one place. Filter, search, and organize candidates efficiently.',
    features: ['Unified inbox', 'Advanced filters', 'Bulk actions', 'Application notes'],
  },
  {
    id: 3,
    icon: GitBranch,
    title: 'Pipeline Stages',
    description: 'Move candidates through your hiring process with drag-and-drop simplicity. Customize stages to match your workflow.',
    features: ['8 default stages', 'Custom stages', 'Drag-and-drop', 'Stage automation'],
  },
  {
    id: 4,
    icon: Star,
    title: 'AI-Powered Ranking',
    description: 'Our AI analyzes each candidate and provides a Fit Index score (0-100) based on skills, experience, and requirements.',
    features: ['Fit Index 0-100', 'Skill matching', 'Experience analysis', 'Ranking explanations'],
  },
  {
    id: 5,
    icon: Calendar,
    title: 'Interview Scheduling',
    description: 'Schedule interviews seamlessly with built-in calendar integration. Send automated reminders to candidates.',
    features: ['Calendar integration', 'Automated reminders', 'Team availability', 'Interview feedback'],
  },
  {
    id: 6,
    icon: MessageSquare,
    title: 'Team Collaboration',
    description: 'Collaborate with your hiring team using @mentions, notes, and shared feedback on candidates.',
    features: ['@mentions', 'Shared notes', 'Team feedback', 'Activity feed'],
  },
];

export default function ATSTourStep({
  onContinue,
  onSkip,
  onSaveAndExit,
  savedData,
}: ATSTourStepProps) {
  const [currentTourStep, setCurrentTourStep] = useState(1);
  const [tourStarted, setTourStarted] = useState(false);

  const currentStep = TOUR_STEPS[currentTourStep - 1];
  const IconComponent = currentStep.icon;

  const handleNext = () => {
    if (currentTourStep < TOUR_STEPS.length) {
      setCurrentTourStep(currentTourStep + 1);
    } else {
      handleCompleteTour();
    }
  };

  const handleBack = () => {
    if (currentTourStep > 1) {
      setCurrentTourStep(currentTourStep - 1);
    }
  };

  const handleCompleteTour = () => {
    onContinue({ tourCompleted: true });
  };

  if (!tourStarted) {
    return (
      <div>
        {/* Welcome Screen */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 data-tour-welcome className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your ATS!
          </h2>
          <p className="text-gray-600 max-w-lg mx-auto">
            Take a quick 2-minute tour to learn about the powerful features that will help you hire amazing talent.
          </p>
        </div>

        {/* Tour Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {TOUR_STEPS.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Icon className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            data-start-tour-button
            onClick={() => setTourStarted(true)}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Start Tour
          </button>

          <button
            type="button"
            data-skip-tour-button
            onClick={onSkip}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <SkipForward className="w-5 h-5" />
            Skip Tour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tour Overlay */}
      <div data-tour-overlay className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8">
        {/* Tour Progress */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {TOUR_STEPS.map((step, index) => (
              <div
                key={step.id}
                data-tour-step={index + 1}
                className={`h-2 w-12 rounded-full ${
                  index + 1 <= currentTourStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {currentTourStep} of {TOUR_STEPS.length}
          </span>
        </div>

        {/* Tour Content */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <IconComponent className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 data-tour-step-title className="text-2xl font-bold text-gray-900 mb-3">
            {currentStep.title}
          </h2>
          <p className="text-gray-700 mb-6 max-w-lg mx-auto">
            {currentStep.description}
          </p>

          {/* Features List */}
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Features:</h3>
            <ul className="space-y-2 text-left">
              {currentStep.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-700">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            data-tour-back-button
            onClick={handleBack}
            disabled={currentTourStep === 1}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <button
            type="button"
            data-tour-next-button
            onClick={handleNext}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
          >
            {currentTourStep === TOUR_STEPS.length ? 'Complete Tour' : 'Next'}
            {currentTourStep < TOUR_STEPS.length && <ChevronRight className="w-5 h-5" />}
          </button>

          <button
            type="button"
            data-skip-tour-button
            onClick={onSkip}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <SkipForward className="w-5 h-5" />
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
