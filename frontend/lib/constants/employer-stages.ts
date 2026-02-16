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
