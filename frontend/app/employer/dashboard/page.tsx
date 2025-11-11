/**
 * Employer Dashboard Page
 * Sprint 17-18 Phase 4
 *
 * Landing page after successful employer login
 */

'use client';

import { useRouter } from 'next/navigation';
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EmployerDashboardPage() {
  const router = useRouter();

  const stats = {
    activeAssessments: 12,
    totalCandidates: 487,
    pendingReviews: 23,
    averageScore: 76,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back! Here's what's happening.</p>
            </div>
            <Button
              onClick={() => router.push('/employer/assessments/new')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Assessment
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Active Assessments</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeAssessments}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Candidates</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCandidates}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Pending Reviews</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingReviews}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-gray-900">{stats.averageScore}%</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/employer/assessments/new')}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Create Assessment</span>
                </div>
                <p className="text-xs text-gray-600">Build a new skills test</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/employer/assessments')}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">View Assessments</span>
                </div>
                <p className="text-xs text-gray-600">Manage your tests</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/employer/analytics')}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">Analytics</span>
                </div>
                <p className="text-xs text-gray-600">View performance metrics</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
