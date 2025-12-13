/**
 * Tour System Types
 * Defines all types for the onboarding tour system
 */

export type TourStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';

export type TourStepPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end';

export interface TourStep {
  /** Unique ID for the step */
  id: string;

  /** CSS selector or element ID to highlight */
  target: string;

  /** Step title */
  title: string;

  /** Step description/content */
  content: string;

  /** Optional image or GIF URL */
  image?: string;

  /** Placement of the tooltip relative to target */
  placement?: TourStepPlacement;

  /** Whether this step requires user interaction with the target */
  interactive?: boolean;

  /** Custom action button text */
  actionLabel?: string;

  /** Callback when action button is clicked */
  onAction?: () => void | Promise<void>;

  /** Wait for element to appear (max timeout in ms) */
  waitForElement?: number;

  /** Skip this step if element doesn't exist */
  skipIfMissing?: boolean;
}

export interface TourConfig {
  /** Unique tour identifier */
  id: string;

  /** Tour name/title */
  name: string;

  /** Tour description */
  description: string;

  /** Steps in the tour */
  steps: TourStep[];

  /** User roles this tour applies to */
  roles?: string[];

  /** Pages where this tour is available */
  pages?: string[];

  /** Priority (higher number = higher priority) */
  priority?: number;

  /** Auto-start on first visit */
  autoStart?: boolean;

  /** Show welcome modal before starting */
  showWelcomeModal?: boolean;

  /** Welcome modal content */
  welcomeTitle?: string;
  welcomeContent?: string;

  /** Required tours that must be completed first */
  prerequisiteTours?: string[];
}

export interface TourProgress {
  /** Tour ID */
  tourId: string;

  /** Current step index (0-based) */
  currentStep: number;

  /** Tour status */
  status: TourStatus;

  /** Last updated timestamp */
  updatedAt: string;

  /** Completion timestamp */
  completedAt?: string;
}

export interface TourContextType {
  /** Start a tour by ID */
  startTour: (tourId: string, fromStep?: number) => void;

  /** Stop the current tour */
  stopTour: () => void;

  /** Go to next step */
  nextStep: () => void;

  /** Go to previous step */
  previousStep: () => void;

  /** Skip the current tour */
  skipTour: () => void;

  /** Complete the current tour */
  completeTour: () => void;

  /** Get progress for a specific tour */
  getTourProgress: (tourId: string) => TourProgress | null;

  /** Get all tour progress */
  getAllProgress: () => TourProgress[];

  /** Reset a specific tour */
  resetTour: (tourId: string) => void;

  /** Reset all tours */
  resetAllTours: () => void;

  /** Currently active tour */
  activeTour: TourConfig | null;

  /** Current step index */
  currentStepIndex: number;

  /** Is tour active */
  isTourActive: boolean;

  /** Settings */
  settings: TourSettings;

  /** Update settings */
  updateSettings: (settings: Partial<TourSettings>) => void;
}

export interface TourSettings {
  /** Enable contextual tooltips */
  tooltipsEnabled: boolean;

  /** Tooltip hover delay (ms) */
  tooltipDelay: number;

  /** Show tour beacons for available tours */
  showBeacons: boolean;

  /** Auto-start tours on first visit */
  autoStartTours: boolean;

  /** Confirm before dismissing first tour */
  confirmFirstDismissal: boolean;

  /** Animation speed */
  animationSpeed: 'slow' | 'normal' | 'fast' | 'none';
}

export interface TourTooltipConfig {
  /** Element selector */
  target: string;

  /** Tooltip content */
  content: string;

  /** Related tour ID (optional) */
  tourId?: string;

  /** "Learn more" link */
  learnMoreUrl?: string;

  /** Placement */
  placement?: TourStepPlacement;
}
