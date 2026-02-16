'use client';

import { useEffect } from 'react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function InterviewCoachPage() {
  useEffect(() => {
    document.title = 'Interview Coach | HireFlux';
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Interview Coach</h1>
        <p className="text-muted-foreground">
          This feature is currently under development. Please check back soon!
        </p>
      </div>
      <EmptyState
        icon={Users}
        title="No interview sessions"
        description="Practice interviews with AI feedback. Build confidence with mock questions tailored to your target roles."
        action={{
          label: 'Start Practice Session',
          onClick: () => { /* TODO: Implement practice session */ },
        }}
      />
    </div>
  );
}
