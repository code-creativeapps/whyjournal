import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CalendarIcon, CheckIcon, GiftIcon, PencilIcon, TargetIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AnimatedBorder } from '@/components/animated-border';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { goalProgress } from '@/lib/goals/progress';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { cn } from '@/lib/utils';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goal = useGoalsStore((state) =>
    id ? state.items.find((g) => g.id === id) : undefined
  );
  const updateGoal = useGoalsStore((state) => state.updateItem);
  const allMilestones = useMilestonesStore((state) => state.items);
  const updateMilestone = useMilestonesStore((state) => state.updateItem);

  const milestones = React.useMemo(
    () => (id ? allMilestones.filter((m) => m.goalId === id) : []),
    [allMilestones, id]
  );
  const progress = React.useMemo(
    () => (goal ? goalProgress(goal, milestones) : null),
    [goal, milestones]
  );

  React.useEffect(() => {
    if (id && !goal && router.canGoBack()) router.back();
  }, [id, goal]);

  if (!goal || !progress) return null;

  const hasMilestones = milestones.length > 0;

  function handleMarkCompleted() {
    if (!goal) return;
    updateGoal(goal.id, {
      done: true,
      completedAt: new Date().toISOString(),
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Goal',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/goal', params: { id: goal.id } })}
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="gap-6 px-6 pt-12 pb-10">
        <View className="items-center gap-4">
          <View className="size-20 items-center justify-center rounded-full bg-red-500/15">
            <Icon as={TargetIcon} size={40} className="text-red-500" />
          </View>
          <Text
            variant="h2"
            className={cn('text-center', goal.done && 'text-muted-foreground line-through')}>
            {goal.title}
          </Text>
          {goal.targetDate ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <Icon as={CalendarIcon} size={13} className="text-muted-foreground" />
              <Text variant="small" className="text-sm text-muted-foreground">
                {goal.targetDate}
              </Text>
            </View>
          ) : null}
        </View>

        {goal.why ? (
          <View className="gap-1">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Why it matters
            </Text>
            <Text className="text-base leading-6">{goal.why}</Text>
          </View>
        ) : null}

        {goal.reward ? (
          <View className="gap-1">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Reward
            </Text>
            <View className="flex-row items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <Icon as={GiftIcon} size={18} className="text-amber-500" />
              <Text className="flex-1 text-base leading-6">{goal.reward}</Text>
            </View>
          </View>
        ) : null}

        {hasMilestones ? (
          <View className="gap-2">
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full bg-red-500"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </View>
            <Text variant="muted" className="text-xs">
              {progress.done} / {progress.total} milestones
            </Text>
          </View>
        ) : null}

        <View className="gap-2">
          <Text variant="muted" className="text-xs uppercase tracking-wide">
            Milestones
          </Text>
          {hasMilestones ? (
            <View className="overflow-hidden rounded-xl border border-border">
              {milestones.map((m, idx) => (
                <View
                  key={m.id}
                  className={cn('flex-row items-center gap-3 px-3 py-3', idx > 0 && 'border-t border-border')}>
                  <Pressable
                    onPress={() =>
                      updateMilestone(m.id, {
                        done: !m.done,
                        completedAt: !m.done ? new Date().toISOString() : undefined,
                      })
                    }
                    hitSlop={8}
                    className={cn(
                      'size-6 items-center justify-center rounded-md border-2',
                      m.done ? 'border-red-500 bg-red-500' : 'border-muted-foreground/40'
                    )}>
                    {m.done ? <Icon as={CheckIcon} size={14} className="text-white" /> : null}
                  </Pressable>
                  <Text
                    className={cn(
                      'flex-1 text-base',
                      m.done && 'text-muted-foreground line-through'
                    )}>
                    {m.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              No milestones yet. Tap Edit to add some.
            </Text>
          )}
        </View>

        {goal.done ? (
          <View className="flex-row items-center gap-2 self-start rounded-full bg-green-500/15 px-3 py-1.5">
            <Icon as={CheckIcon} size={14} className="text-green-600" />
            <Text className="text-sm font-semibold text-green-700">Completed</Text>
          </View>
        ) : (
          <View className="mt-2">
            <AnimatedBorder>
              <HoldToConfirmButton
                label="Hold to mark as completed"
                icon={CheckIcon}
                onConfirm={handleMarkCompleted}
              />
            </AnimatedBorder>
          </View>
        )}
      </ScrollView>
    </>
  );
}
