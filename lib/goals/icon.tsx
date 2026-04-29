import {
  ActivityIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CodeIcon,
  CompassIcon,
  CrownIcon,
  FlameIcon,
  HeartIcon,
  LeafIcon,
  MountainIcon,
  RocketIcon,
  SparklesIcon,
  StarIcon,
  TargetIcon,
  TrophyIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Target: TargetIcon,
  Trophy: TrophyIcon,
  Star: StarIcon,
  Heart: HeartIcon,
  Flame: FlameIcon,
  Mountain: MountainIcon,
  Compass: CompassIcon,
  Sparkles: SparklesIcon,
  Crown: CrownIcon,
  Rocket: RocketIcon,
  Briefcase: BriefcaseIcon,
  BookOpen: BookOpenIcon,
  Activity: ActivityIcon,
  Zap: ZapIcon,
  Leaf: LeafIcon,
  Code: CodeIcon,
};

export const LUCIDE_ICON_NAMES = Object.keys(LUCIDE_ICON_MAP);

export const GOAL_EMOJIS = [
  '🎯', '🏔️', '💪', '🏆', '📚', '🚀',
  '💼', '💡', '🌱', '❤️', '🎨', '🏃',
  '🧘', '💰', '🌊', '🎓', '🏠', '✈️',
  '📝', '🎵', '💻', '🛠️', '🥇', '🌟',
  '🔥', '⚡', '🌍', '🎬', '🍎', '☀️',
  '🧩', '🦋', '🪴', '⛰️', '🏝️', '🪙',
];

export function isLucideIcon(value: string | undefined): boolean {
  return Boolean(value && LUCIDE_ICON_MAP[value]);
}

/**
 * Render the goal's icon: a Lucide icon (when `icon` matches a known
 * Lucide name), an emoji string (any other non-empty value), or the
 * default `TargetIcon` when not set.
 */
export function GoalIcon({
  icon,
  size,
  className,
}: {
  icon?: string;
  size: number;
  className?: string;
}) {
  if (icon && LUCIDE_ICON_MAP[icon]) {
    return <Icon as={LUCIDE_ICON_MAP[icon]} size={size} className={className} />;
  }
  if (icon) {
    return (
      <Text style={{ fontSize: size, lineHeight: size * 1.05 }}>{icon}</Text>
    );
  }
  return <Icon as={TargetIcon} size={size} className={className} />;
}

/**
 * Goal-icon inside the standard tinted circle. The circle goes neutral
 * for emojis (so their colors aren't fighting a red background) and
 * keeps the red tint for Lucide picks + the default target.
 */
export function GoalIconCircle({
  icon,
  done,
  size = 'md',
  className,
}: {
  icon?: string;
  done?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const isEmoji = Boolean(icon) && !LUCIDE_ICON_MAP[icon as string];
  const sizing =
    size === 'sm'
      ? { box: 'size-6', icon: 14 }
      : size === 'lg'
        ? { box: 'size-16', icon: 32 }
        : { box: 'size-10', icon: 20 };

  return (
    <View
      className={cn(
        sizing.box,
        'items-center justify-center rounded-full',
        done
          ? 'bg-green-600'
          : isEmoji
            ? 'bg-muted'
            : 'bg-red-500/15',
        className
      )}>
      <GoalIcon
        icon={icon}
        size={sizing.icon}
        className={done ? 'text-white' : 'text-red-500'}
      />
    </View>
  );
}
