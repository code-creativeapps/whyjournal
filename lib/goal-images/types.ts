export type GoalImageSource = 'upload' | 'pexels';

export type GoalImage = {
  id: string;
  goalId: string;
  url: string;
  source: GoalImageSource;
  attribution?: string;
  position: number;
  createdAt: string;
};

export type NewGoalImageInput = Omit<GoalImage, 'id' | 'createdAt'>;
