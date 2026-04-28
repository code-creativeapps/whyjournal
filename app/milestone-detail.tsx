import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  CalendarIcon,
  CheckIcon,
  PencilIcon,
  RotateCcwIcon,
  TargetIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { AnimatedBorder } from '@/components/animated-border';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { celebrateGoal, onCelebrateGoal } from '@/lib/celebrate';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { cn } from '@/lib/utils';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MilestoneDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const milestone = useMilestonesStore((state) =>
    id ? state.items.find((m) => m.id === id) : undefined
  );
  const updateMilestone = useMilestonesStore((state) => state.updateItem);
  const goal = useGoalsStore((state) =>
    milestone ? state.items.find((g) => g.id === milestone.goalId) : undefined
  );

  const [confettiTrigger, setConfettiTrigger] = React.useState(0);

  React.useEffect(
    () => onCelebrateGoal(() => setConfettiTrigger((t) => t + 1)),
    []
  );

  React.useEffect(() => {
    if (id && !milestone && router.canGoBack()) router.back();
  }, [id, milestone]);

  if (!milestone) return null;

  function handleMarkCompleted() {
    if (!milestone) return;
    updateMilestone(milestone.id, {
      done: true,
      completedAt: new Date().toISOString(),
    });
    celebrateGoal();
  }

  function handleMarkNotCompleted() {
    if (!milestone) return;
    updateMilestone(milestone.id, {
      done: false,
      completedAt: undefined,
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Milestone',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/milestone', params: { id: milestone.id } })
              }
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
              milestone.done ? 'bg-green-500' : 'bg-pink-400/15'
            )}>
            <Icon
              as={TargetIcon}
              size={40}
              className={milestone.done ? 'text-white' : 'text-pink-400'}
            />
          </View>
          <Text
            variant="h2"
            className={cn(
              'border-b-0 pb-0 text-center',
              milestone.done && 'text-muted-foreground line-through'
            )}>
            {milestone.title}
          </Text>
          {milestone.targetDate ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <Icon as={CalendarIcon} size={13} className="text-muted-foreground" />
              <Text variant="small" className="text-sm text-muted-foreground">
                {milestone.targetDate}
              </Text>
            </View>
          ) : null}
          {goal ? (
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: '/goal-detail',
                  params: { id: goal.id },
                })
              }
              className="flex-row items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 active:bg-red-500/20">
              <Icon as={TargetIcon} size={13} className="text-red-500" />
              <Text variant="small" className="text-sm text-red-600">
                {goal.title}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {milestone.body ? (
          <Text className="text-center text-base leading-7 text-foreground">
            {milestone.body}
          </Text>
        ) : null}

        <View className="mt-2">
          {milestone.done ? (
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
