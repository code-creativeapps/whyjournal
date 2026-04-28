import { CheckIcon, HeartIcon, TrendingUpIcon, type LucideIcon } from 'lucide-react-native';

import type { EntryType } from './types';

export type EntryVisual = {
  label: string;
  icon: LucideIcon;
  /** Tailwind class for the small badge background (e.g. behind the icon). */
  badgeBgClass: string;
  /** Tailwind class for the icon color. */
  iconColorClass: string;
  /** Tailwind class for the type-toggle's selected border color. */
  toggleBorderClass: string;
  /** Tailwind class for the type-toggle's selected fill. */
  toggleFillClass: string;
  /** Placeholder copy used in the entry form's title input. */
  titlePlaceholder: string;
};

export const ENTRY_VISUALS: Record<EntryType, EntryVisual> = {
  win: {
    label: 'Win',
    icon: CheckIcon,
    badgeBgClass: 'bg-green-500/15',
    iconColorClass: 'text-green-600',
    toggleBorderClass: 'border-green-500',
    toggleFillClass: 'bg-green-500/5',
    titlePlaceholder: 'What went well?',
  },
  gratitude: {
    label: 'Gratitude',
    icon: HeartIcon,
    badgeBgClass: 'bg-pink-500/15',
    iconColorClass: 'text-pink-600',
    toggleBorderClass: 'border-pink-500',
    toggleFillClass: 'bg-pink-500/5',
    titlePlaceholder: 'What are you grateful for?',
  },
  confirmation: {
    label: 'Confirmation',
    icon: TrendingUpIcon,
    badgeBgClass: 'bg-indigo-500/15',
    iconColorClass: 'text-indigo-600',
    toggleBorderClass: 'border-indigo-500',
    toggleFillClass: 'bg-indigo-500/5',
    titlePlaceholder: 'What confirmed it today?',
  },
};
