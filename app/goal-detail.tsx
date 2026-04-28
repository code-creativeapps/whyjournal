import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CalendarIcon, CheckIcon, GiftIcon, PencilIcon, RotateCcwIcon, TargetIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { AnimatedBorder } from '@/components/animated-border';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { celebrateGoal, onCelebrateGoal } from '@/lib/celebrate';
import { goalProgress } from '@/lib/goals/progress';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { cn } from '@/lib/utils';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goal = useGoalsStore((state) =>
    id ? state.items.find((g) => g.id === id) : undefined
  );
  const updateGoal = useGoalsStore((state) => state.updateItem);
  const allMilestones = useMilestonesStore((state) => state.items);

  const milestones = React.useMemo(() => {
    if (!id) return [];
    return allMilestones
      .filter((m) => m.goalId === id)
      .slice()
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.createdAt.localeCompare(b.createdAt)
      );
  }, [allMilestones, id]);
  const progress = React.useMemo(
    () => (goal ? goalProgress(goal, milestones) : null),
    [goal, milestones]
  );

  // Each celebration bumps this counter; ConfettiCannon is mounted with that
  // counter as a key so it remounts fresh and auto-starts. Avoids the un-fired
  // cannon's stacked confetti pieces showing as a visual glitch on the screen.
  const [confettiTrigger, setConfettiTrigger] = React.useState(0);

  React.useEffect(
    () => onCelebrateGoal(() => setConfettiTrigger((t) => t + 1)),
    []
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
    celebrateGoal();
  }

  function handleMarkNotCompleted() {
    if (!goal) return;
    updateGoal(goal.id, {
      done: false,
      completedAt: undefined,
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
          <View
            className={cn(
              'size-20 items-center justify-center rounded-full',
              goal.done ? 'bg-green-600' : 'bg-red-500/15'
            )}>
            <Icon
              as={TargetIcon}
              size={40}
              className={goal.done ? 'text-white' : 'text-red-500'}
            />
          </View>
          <Text
            variant="h2"
            className={cn(
              'border-b-0 pb-0 text-center',
              goal.done && 'text-muted-foreground line-through'
            )}>
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
                <React.Fragment key={m.id}>
                  {idx > 0 ? <View className="h-px bg-border" /> : null}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/milestone-detail',
                        params: { id: m.id },
                      })
                    }
                    className="flex-row items-center gap-3 px-3 py-3 active:bg-accent">
                    <View
                      className={cn(
                        'size-6 items-center justify-center rounded-full',
                        m.done ? 'bg-green-500' : 'bg-pink-400/15'
                      )}>
                      <Icon
                        as={TargetIcon}
                        size={14}
                        className={m.done ? 'text-white' : 'text-pink-400'}
                      />
                    </View>
                    <Text
                      className={cn(
                        'flex-1 text-base',
                        m.done && 'text-muted-foreground line-through'
                      )}>
                      {m.title}
                    </Text>
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              No milestones yet. Tap Edit to add some.
            </Text>
          )}
        </View>

        <View className="mt-2">
          {goal.done ? (
            // Match outer height of AnimatedBorder (which adds 2pt padding all around).
            <View style={{ padding: 2 }}>
              <HoldToConfirmButton
                label="Hold to mark as not completed"
                icon={RotateCcwIcon}
                onConfirm={handleMarkNotCompleted}
                silent
              />
            </View>
          ) : (
            <AnimatedBorder>
              <HoldToConfirmButton
                label="Hold to mark as completed"
                icon={CheckIcon}
                onConfirm={handleMarkCompleted}
              />
            </AnimatedBorder>
          )}
        </View>
      </ScrollView>
      {confettiTrigger > 0 ? (
        <View pointerEvents="none" className="absolute inset-0">
          <ConfettiCannon
            key={confettiTrigger}
            count={120}
            origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={2800}
          />
        </View>
      ) : null}
    </>
  );
}
