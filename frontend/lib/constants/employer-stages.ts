export type EmployerStageId = 'new' | 'reviewing' | 'phone_screen' | 'technical_interview' | 'final_interview' | 'offer' | 'hired' | 'rejected';

export interface EmployerStage {
  id: EmployerStageId;
  label: string;
  color: string;
}

export const EMPLOYER_STAGES: EmployerStage[] = [
  { id: 'new', label: 'New', color: 'blue' },
  { id: 'reviewing', label: 'Reviewing', color: 'yellow' },
  { id: 'phone_screen', label: 'Phone Screen', color: 'purple' },
  { id: 'technical_interview', label: 'Technical Interview', color: 'orange' },
  { id: 'final_interview', label: 'Final Interview', color: 'green' },
  { id: 'offer', label: 'Offer', color: 'green' },
  { id: 'hired', label: 'Hired', color: 'green' },
  { id: 'rejected', label: 'Rejected', color: 'red' },
];

export const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  phone_screen: 'Phone Screen',
  technical_interview: 'Technical Interview',
  final_interview: 'Final Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export const STAGE_COLORS: Record<string, string> = {
  new: '#3B82F6',
  reviewing: '#8B5CF6',
  phone_screen: '#EC4899',
  technical_interview: '#F59E0B',
  final_interview: '#10B981',
  offer: '#14B8A6',
  hired: '#06B6D4',
  rejected: '#EF4444',
};
