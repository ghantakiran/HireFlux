/**
 * Test Page for Employer Registration Component
 * Sprint 19-20 Week 39 Day 2
 *
 * Navigate to: http://localhost:3000/test/employer-registration
 */

'use client';

import React from 'react';
import { EmployerRegistration } from '@/components/employer/EmployerRegistration';

export default function EmployerRegistrationTestPage() {
  const handleComplete = (data: any) => {
    console.log('Registration complete:', data);
    alert('Registration completed! Check console for data.');
  };

  const handleCancel = () => {
    console.log('Registration cancelled');
    alert('Registration cancelled');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Employer Registration Test Page
          </h1>
          <p className="text-gray-600">
            Testing the 6-step registration wizard component
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Sprint 19-20 Week 39 Day 2 - TDD Implementation
          </p>
        </div>

        <EmployerRegistration onComplete={handleComplete} onCancel={handleCancel} />
      </div>
    </div>
  );
}
