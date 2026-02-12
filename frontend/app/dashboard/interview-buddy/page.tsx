'use client';

import { Mic } from 'lucide-react';
import { EmptyState } from '@/components/domain/EmptyState';

export default function InterviewCoachPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Interview Coach</h1>
        <p className="text-muted-foreground">
          This feature is currently under development. Please check back soon!
        </p>
      </div>
      <EmptyState
        title="No interview sessions"
        description="Practice mock interviews with AI-powered feedback to ace your next interview."
        icon={<Mic className="h-12 w-12 text-muted-foreground" />}
        actionLabel="Start Practice"
        onAction={() => console.log('Start practice session')}
      />
    </div>
  );
}
