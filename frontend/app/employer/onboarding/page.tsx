/**
 * Employer Onboarding Container (Issue #112)
 *
 * Multi-step onboarding flow for new employers
 * - 5 steps: Company Profile → Job Post → Team → ATS Tour → Complete
 * - Progress tracking (0-100%)
 * - State persistence (localStorage + API)
 * - Skip and save/exit options
 * - Resume incomplete onboarding
 * - Mobile responsive
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Circle } from 'lucide-react';

// Step components (to be implemented)
import CompanyProfileStep from './steps/CompanyProfileStep';
import JobPostStep from './steps/JobPostStep';
import TeamInvitationStep from './steps/TeamInvitationStep';
import ATSTourStep from './steps/ATSTourStep';
import CompletionStep from './steps/CompletionStep';

// ============================================================================
// Types
// ============================================================================

interface OnboardingStep {
  id: number;
  title: string;
  status: 'pending' | 'active' | 'complete';
}

export interface OnboardingData {
  currentStep: number;
  completedSteps: number[];
  companyProfile?: Record<string, string>;
  firstJob?: Record<string, string>;
  teamInvitations?: Array<{ id: string; email: string; role: string }>;
  tourCompleted?: boolean;
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const ONBOARDING_STEPS = [
  { id: 1, title: 'Company Profile' },
  { id: 2, title: 'First Job Post' },
  { id: 3, title: 'Team Invitations' },
  { id: 4, title: 'ATS Tour' },
  { id: 5, title: 'Complete' },
];

// ============================================================================
// Component
// ============================================================================

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get('step') || '1');

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    currentStep: initialStep,
    completedSteps: [],
  });

  // ============================================================================
  // Load saved onboarding progress
  // ============================================================================

  useEffect(() => {
    const savedData = localStorage.getItem('employer_onboarding');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCurrentStep(parsed.currentStep || 1);
        setCompletedSteps(parsed.completedSteps || []);
        setOnboardingData(parsed);
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      }
    }
  }, []);

  // ============================================================================
  // Save progress to localStorage
  // ============================================================================

  const saveProgress = (data: Partial<OnboardingData>) => {
    const newData = { ...onboardingData, ...data };
    setOnboardingData(newData);
    localStorage.setItem('employer_onboarding', JSON.stringify(newData));
  };

  // ============================================================================
  // Calculate progress percentage
  // ============================================================================

  const calculateProgress = (): number => {
    return Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100);
  };

  // ============================================================================
  // Step navigation
  // ============================================================================

  const goToStep = (step: number) => {
    setCurrentStep(step);
    saveProgress({ currentStep: step });
    router.push(`/employer/onboarding?step=${step}`);
  };

  const handleStepComplete = (stepData: Record<string, unknown> | unknown[]) => {
    const newCompletedSteps = [...completedSteps, currentStep].filter(
      (v, i, a) => a.indexOf(v) === i
    );
    setCompletedSteps(newCompletedSteps);

    // Save step-specific data
    const stepKey = getStepDataKey(currentStep);
    saveProgress({
      currentStep: currentStep + 1,
      completedSteps: newCompletedSteps,
      [stepKey]: stepData,
    });

    // Move to next step or complete
    if (currentStep < ONBOARDING_STEPS.length) {
      goToStep(currentStep + 1);
    }
  };

  const handleSkipStep = () => {
    const newCompletedSteps = [...completedSteps, currentStep].filter(
      (v, i, a) => a.indexOf(v) === i
    );
    setCompletedSteps(newCompletedSteps);

    saveProgress({
      currentStep: currentStep + 1,
      completedSteps: newCompletedSteps,
    });

    if (currentStep < ONBOARDING_STEPS.length) {
      goToStep(currentStep + 1);
    }
  };

  const handleSaveAndExit = () => {
    saveProgress({ currentStep });
    router.push('/employer/dashboard');
  };

  const getStepDataKey = (step: number): string => {
    const keys = ['', 'companyProfile', 'firstJob', 'teamInvitations', 'tourCompleted', ''];
    return keys[step] || '';
  };

  // ============================================================================
  // Get step status
  // ============================================================================

  const getStepStatus = (stepId: number): 'pending' | 'active' | 'complete' => {
    if (completedSteps.includes(stepId)) return 'complete';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  // ============================================================================
  // Render current step
  // ============================================================================

  const renderStep = () => {
    const commonProps = {
      onContinue: handleStepComplete,
      onSkip: handleSkipStep,
      onSaveAndExit: handleSaveAndExit,
      savedData: onboardingData,
    };

    switch (currentStep) {
      case 1:
        return <CompanyProfileStep {...commonProps} />;
      case 2:
        return <JobPostStep {...commonProps} />;
      case 3:
        return <TeamInvitationStep {...commonProps} />;
      case 4:
        return <ATSTourStep {...commonProps} />;
      case 5:
        return <CompletionStep onboardingData={onboardingData} />;
      default:
        return <CompanyProfileStep {...commonProps} />;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-4">
            {ONBOARDING_STEPS.map((step, index) => {
              const status = getStepStatus(step.id);
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div
                    data-step={step.id}
                    data-status={status}
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      status === 'complete'
                        ? 'bg-green-600'
                        : status === 'active'
                        ? 'bg-blue-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    {status === 'complete' ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <Circle
                        className={`w-6 h-6 ${
                          status === 'active' ? 'text-white' : 'text-gray-500'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs text-center hidden sm:block ${
                      status === 'active' ? 'font-semibold text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {step.title}
                  </span>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div
                      className={`absolute h-0.5 w-1/${ONBOARDING_STEPS.length - 1} left-1/${index + 1} top-5 ${
                        completedSteps.includes(step.id) ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div data-progress-bar className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Progress Text */}
          <p data-progress-text className="text-sm text-gray-600 text-center">
            Step {currentStep} of {ONBOARDING_STEPS.length} - {progress}% Complete
          </p>
        </div>

        {/* Current Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
