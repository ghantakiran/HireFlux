/**
 * Onboarding Step 5: Completion Screen (Issue #112)
 *
 * Onboarding completion and next steps
 * - Completion summary
 * - What was accomplished
 * - Recommended next steps
 * - Navigate to dashboard CTA
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Sparkles, Briefcase, Users, TrendingUp } from 'lucide-react';

interface CompletionStepProps {
  onboardingData: any;
}

export default function CompletionStep({ onboardingData }: CompletionStepProps) {
  const router = useRouter();

  const handleGoToDashboard = () => {
    // Clear onboarding data from localStorage
    localStorage.removeItem('employer_onboarding');
    router.push('/employer/dashboard');
  };

  // Determine what was completed
  const completedCompanyProfile = !!onboardingData.companyProfile;
  const completedJobPost = !!onboardingData.firstJob;
  const completedTeamInvites = onboardingData.teamInvitations?.length > 0;
  const completedTour = !!onboardingData.tourCompleted;

  return (
    <div className="text-center">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-3xl font-bold text-gray-900 mb-2">
        Congratulations! You're All Set!
      </h2>
      <p className="text-gray-600 mb-8 max-w-lg mx-auto">
        Your employer account is now ready. Let's start finding amazing talent for your team.
      </p>

      {/* Completion Summary */}
      <div data-completion-summary className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What You've Accomplished:
        </h3>
        <div className="space-y-3 text-left max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${completedCompanyProfile ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-900">Company Profile</p>
              <p className="text-sm text-gray-600">
                {completedCompanyProfile
                  ? `Set up ${onboardingData.companyProfile?.name}`
                  : 'Skipped'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${completedJobPost ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-900">First Job Post</p>
              <p className="text-sm text-gray-600">
                {completedJobPost
                  ? `Posted "${onboardingData.firstJob?.title}"`
                  : 'Skipped'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${completedTeamInvites ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-900">Team Invitations</p>
              <p className="text-sm text-gray-600">
                {completedTeamInvites
                  ? `Invited ${onboardingData.teamInvitations?.length} team member${onboardingData.teamInvitations?.length > 1 ? 's' : ''}`
                  : 'Skipped'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${completedTour ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-900">ATS Tour</p>
              <p className="text-sm text-gray-600">
                {completedTour ? 'Completed product tour' : 'Skipped'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div data-next-steps className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recommended Next Steps:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm mb-1">Use AI Ranking</p>
              <p className="text-xs text-gray-600">
                Let AI analyze and rank candidates as they apply
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm mb-1">Post More Jobs</p>
              <p className="text-xs text-gray-600">
                Add additional job postings to attract more candidates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm mb-1">Browse Candidates</p>
              <p className="text-xs text-gray-600">
                Search our candidate database and invite to apply
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        data-go-to-dashboard-button
        onClick={handleGoToDashboard}
        className="bg-blue-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-3 mx-auto"
      >
        <TrendingUp className="w-6 h-6" />
        Go to Dashboard
      </button>

      <p className="mt-4 text-sm text-gray-500">
        You can always access help and documentation from your dashboard
      </p>
    </div>
  );
}
