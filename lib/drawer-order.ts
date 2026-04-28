export const DRAWER_ORDER = [
  'index',
  'affirmations',
  'bucket',
  'goals',
  'habits',
  'trophies',
  'todos',
] as const;

export type DrawerRoute = (typeof DRAWER_ORDER)[number];

export const ROUTE_TO_PATH: Record<DrawerRoute, string> = {
  index: '/',
  affirmations: '/affirmations',
  bucket: '/bucket',
  goals: '/goals',
  habits: '/habits',
  trophies: '/trophies',
  todos: '/todos',
};
