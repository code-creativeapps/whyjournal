export type CoachContextItem =
  | { kind: 'goal'; id: string; title: string; isCornerstone: boolean }
  | { kind: 'milestone'; id: string; goalId: string; title: string; done: boolean }
  | { kind: 'project'; id: string; goalId: string; milestoneId?: string; title: string; done: boolean };

export type CoachAnswers = Record<string, string>;

/** A single Q+A pair recorded during a Deep-mode discovery flow. */
export type DiscoverTurn = { question: string; answer: string };

export type CoachMode = 'quick' | 'deep';

export const DEEP_TOTAL_TURNS = 5;

/** A discovery question generated upfront for a specific dream. */
export type GeneratedStep = {
  id: string;
  phase: CoachPhase;
  question: string;
  suggestions: string[];
};

export type GeneratedScript = {
  message: string;
  steps: GeneratedStep[];
};

export type PlannedGoal = {
  tempId: string;
  title: string;
  why?: string;
  targetDate?: string;
  isCornerstone?: boolean;
};

export type PlannedMilestone = {
  tempId: string;
  goalRef: string;
  title: string;
  targetDate?: string;
  reward?: string;
};

export type PlannedProject = {
  tempId: string;
  goalRef: string;
  milestoneRef?: string;
  title: string;
  body?: string;
};

export type PlannedTask = {
  tempId: string;
  projectRef: string;
  title: string;
};

export type PlannedHabit = {
  tempId: string;
  goalRef?: string;
  title: string;
  frequencyKind: 'daily' | 'weekly';
  /** For daily: how many times per day (usually 1). For weekly: times per week. */
  timesPerPeriod: number;
  /** 0=Sun..6=Sat. Empty array means "every day" for daily; ignored for weekly. */
  daysOfWeek: number[];
};

export type CoachPhase =
  | 'dream'
  | 'current_state'
  | 'constraints'
  | 'strategy'
  | 'drill_in'
  | 'ready';

export type CoachQuestionsResponse = {
  kind: 'questions';
  message: string;
  questions: string[];
  suggestions: string[];
  phase: CoachPhase;
};

export type CoachPlanResponse = {
  kind: 'plan';
  message: string;
  phase: CoachPhase;
  suggestions: string[];
  goals: PlannedGoal[];
  milestones: PlannedMilestone[];
  projects: PlannedProject[];
  todos: PlannedTask[];
  habits: PlannedHabit[];
};

export type CoachResponse = CoachQuestionsResponse | CoachPlanResponse;
