import { router } from 'expo-router';
import { LayersIcon, TargetIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Project } from '@/lib/projects/types';
import type { Todo } from '@/lib/todos/types';
import { cn } from '@/lib/utils';

export type ProjectRowMilestone = { id: string; title: string };
export type ProjectRowGoal = { id: string; title: string };

export function ProjectRow({
  project,
  goal,
  milestone,
  tasks,
}: {
  project: Project;
  goal?: ProjectRowGoal;
  milestone?: ProjectRowMilestone;
  tasks: Todo[];
}) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  // Goal first; only fall back to the milestone label when no goal is being
  // displayed (e.g. inside goal-detail where the goal is already implied).
  const parentLabel = goal?.title ?? milestone?.title;
  const subtitleParts: string[] = [];
  if (parentLabel) subtitleParts.push(parentLabel);
  if (total > 0) subtitleParts.push(`${done} / ${total} tasks`);
  const subtitle = subtitleParts.join(' · ') || undefined;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/project-detail', params: { id: project.id } })
      }
      className="flex-row items-center gap-3 px-4 py-2 active:bg-accent">
      <View
        className={cn(
          'size-6 items-center justify-center rounded-full',
          project.done ? 'bg-green-600' : 'bg-cyan-500/15'
        )}>
        <Icon
          as={LayersIcon}
          size={14}
          className={project.done ? 'text-white' : 'text-cyan-500'}
        />
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            'text-base',
            project.done && 'text-muted-foreground line-through'
          )}
          numberOfLines={1}>
          {project.title}
        </Text>
        {subtitle ? (
          <View className="flex-row items-center gap-1">
            {milestone ? (
              <Icon as={TargetIcon} size={11} className="text-pink-400" />
            ) : null}
            <Text variant="muted" className="text-xs" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
