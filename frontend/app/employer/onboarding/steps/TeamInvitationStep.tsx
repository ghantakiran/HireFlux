/**
 * Onboarding Step 3: Team Invitations (Issue #112)
 *
 * Invite team members to collaborate
 * - Email-based invitations
 * - Role selection (6 roles)
 * - Multiple invitations
 * - Pending invitations list
 * - Skip option
 */

'use client';

import React, { useState } from 'react';
import { Users, Plus, Trash2, SkipForward, Send } from 'lucide-react';

interface TeamInvitationStepProps {
  onContinue: (data: any) => void;
  onSkip: () => void;
  onSaveAndExit: () => void;
  savedData: any;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
}

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'viewer', label: 'Viewer' },
];

export default function TeamInvitationStep({
  onContinue,
  onSkip,
  onSaveAndExit,
  savedData,
}: TeamInvitationStepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('recruiter');
  const [invitations, setInvitations] = useState<Invitation[]>(
    savedData?.teamInvitations || []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddInvitation = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (invitations.some(inv => inv.email === email)) {
      newErrors.email = 'This email has already been invited';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newInvitation: Invitation = {
      id: Date.now().toString(),
      email,
      role,
    };

    setInvitations([...invitations, newInvitation]);
    setEmail('');
    setRole('recruiter');
    setErrors({});
  };

  const handleRemoveInvitation = (id: string) => {
    setInvitations(invitations.filter(inv => inv.id !== id));
  };

  const handleContinue = () => {
    onContinue(invitations);
  };

  return (
    <div>
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 data-step-heading className="text-2xl font-bold text-gray-900">
            Invite your team
          </h2>
        </div>
        <p className="text-gray-600">
          Collaborate with your hiring team. You can always invite more people later.
        </p>
      </div>

      {/* Invitation Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Email Input */}
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              data-invite-email-input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({});
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddInvitation();
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="teammate@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Role Select */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              data-role-select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          data-add-invitation-button
          onClick={handleAddInvitation}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Invitation
        </button>
      </div>

      {/* Pending Invitations List */}
      {invitations.length > 0 && (
        <div data-pending-invitations className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map(invitation => (
              <div
                key={invitation.id}
                data-invitation-item
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{invitation.role}</p>
                </div>
                <button
                  type="button"
                  data-remove-invitation-button
                  onClick={() => handleRemoveInvitation(invitation.id)}
                  className="text-red-600 hover:text-red-700 p-2"
                  aria-label="Remove invitation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          data-send-invitations-button
          onClick={handleContinue}
          disabled={invitations.length === 0}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {invitations.length > 0 ? `Send ${invitations.length} Invitation${invitations.length > 1 ? 's' : ''}` : 'Continue'}
        </button>

        <button
          type="button"
          data-skip-button
          onClick={onSkip}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
        >
          <SkipForward className="w-5 h-5" />
          Skip for Now
        </button>
      </div>
    </div>
  );
}
