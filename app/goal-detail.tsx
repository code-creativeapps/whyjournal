import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  CalendarIcon,
  CheckIcon,
  GiftIcon,
  PencilIcon,
  PlusIcon,
  RepeatIcon,
  RotateCcwIcon,
  SparklesIcon,
  TargetIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { AnimatedBorder } from '@/components/animated-border';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { celebrateGoal, onCelebrateGoal } from '@/lib/celebrate';
import { goalProgress } from '@/lib/goals/progress';
import { goalVelocity } from '@/lib/goals/velocity';
import type { Habit } from '@/lib/habits/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useTodosStore } from '@/lib/stores/todos';
import { cn } from '@/lib/utils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VELOCITY_DAYS = 14;

type GoalTab = 'description' | 'milestones' | 'systems';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goal = useGoalsStore((state) =>
    id ? state.items.find((g) => g.id === id) : undefined
  );
  const updateGoal = useGoalsStore((state) => state.updateItem);
  const allMilestones = useMilestonesStore((state) => state.items);
  const allTodos = useTodosStore((state) => state.items);
  const allHabits = useHabitsStore((state) => state.items);
  const allHabitCompletions = useHabitCompletionsStore((state) => state.items);

  const [tab, setTab] = React.useState<GoalTab>('description');

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

  const habitsForGoal = React.useMemo(() => {
    if (!id) return [];
    return allHabits
      .filter((h) => h.goalId === id)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [allHabits, id]);

  const velocity = React.useMemo(() => {
    if (!id) return [];
    return goalVelocity({
      goalId: id,
      milestones: allMilestones,
      todos: allTodos,
      habits: allHabits,
      habitCompletions: allHabitCompletions,
      days: VELOCITY_DAYS,
    });
  }, [id, allMilestones, allTodos, allHabits, allHabitCompletions]);

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

        <SegmentedTab value={tab} onChange={setTab} />

        {tab === 'description' ? (
          <DescriptionTab goal={goal} velocity={velocity} />
        ) : null}
        {tab === 'milestones' ? (
          <MilestonesTab
            goalId={goal.id}
            milestones={milestones}
            progress={progress}
            hasMilestones={hasMilestones}
          />
        ) : null}
        {tab === 'systems' ? (
          <SystemsTab goalId={goal.id} habits={habitsForGoal} />
        ) : null}

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

const TABS: { value: GoalTab; label: string }[] = [
  { value: 'description', label: 'Description' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'systems', label: 'Systems' },
];

function SegmentedTab({
  value,
  onChange,
}: {
  value: GoalTab;
  onChange: (v: GoalTab) => void;
}) {
  return (
    <View className="flex-row rounded-full bg-muted p-1">
      {TABS.map((t) => {
        const active = value === t.value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            className={cn(
              'flex-1 items-center rounded-full py-1.5',
              active && 'bg-background shadow-sm'
            )}>
            <Text
              className={cn(
                'text-sm font-medium',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DescriptionTab({
  goal,
  velocity,
}: {
  goal: { body?: string; why?: string; reward?: string };
  velocity: { date: string; count: number }[];
}) {
  const hasAny = Boolean(goal.body || goal.why || goal.reward);

  return (
    <View className="gap-6">
      {goal.body ? (
        <View className="gap-1">
          <Text variant="muted" className="text-xs uppercase tracking-wide">
            Vivid description
          </Text>
          <Text className="text-base leading-6">{goal.body}</Text>
        </View>
      ) : null}

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

      {!hasAny ? (
        <Text variant="muted" className="text-sm">
          No description yet. Tap Edit to add one.
        </Text>
      ) : null}

      <VelocityChart days={velocity} />
    </View>
  );
}

function VelocityChart({ days }: { days: { date: string; count: number }[] }) {
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1.5">
        <Icon as={SparklesIcon} size={13} className="text-muted-foreground" />
        <Text variant="muted" className="text-xs uppercase tracking-wide">
          Velocity · last {days.length} days
        </Text>
      </View>
      {total === 0 ? (
        <Text variant="muted" className="text-sm">
          No activity yet — complete a milestone, todo, or linked habit.
        </Text>
      ) : (
        <View className="gap-1.5">
          <View className="h-20 flex-row items-end gap-1">
            {days.map((d) => {
              const ratio = max > 0 ? d.count / max : 0;
              const heightPct = d.count === 0 ? 0 : Math.max(8, ratio * 100);
              return (
                <View key={d.date} className="flex-1 justify-end">
                  <View
                    className={cn(
                      'rounded-sm',
                      d.count > 0 ? 'bg-red-500/70' : 'bg-muted'
                    )}
                    style={{ height: d.count === 0 ? 4 : `${heightPct}%` }}
                  />
                </View>
              );
            })}
          </View>
          <Text variant="muted" className="text-xs">
            {total} action{total === 1 ? '' : 's'} · best day {max}
          </Text>
        </View>
      )}
    </View>
  );
}

function MilestonesTab({
  goalId,
  milestones,
  progress,
  hasMilestones,
}: {
  goalId: string;
  milestones: ReturnType<typeof useMilestonesStore.getState>['items'];
  progress: { done: number; total: number; ratio: number };
  hasMilestones: boolean;
}) {
  return (
    <View className="gap-4">
      {hasMilestones ? (
        <>
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
        </>
      ) : (
        <Text variant="muted" className="text-sm">
          No milestones yet — add the first step.
        </Text>
      )}

      <Button
        variant="outline"
        onPress={() =>
          router.push({ pathname: '/milestone', params: { goalId } })
        }>
        <Icon as={PlusIcon} className="text-foreground" />
        <Text>Add milestone</Text>
      </Button>
    </View>
  );
}

function SystemsTab({ goalId, habits }: { goalId: string; habits: Habit[] }) {
  const sheetRef = React.useRef<BottomSheetModal>(null);
  const allHabits = useHabitsStore((s) => s.items);
  const allGoals = useGoalsStore((s) => s.items);
  const updateHabit = useHabitsStore((s) => s.updateItem);

  const attachable = React.useMemo(
    () => allHabits.filter((h) => h.goalId !== goalId),
    [allHabits, goalId]
  );

  return (
    <BottomSheetModalProvider>
    <View className="gap-4">
      {habits.length > 0 ? (
        <View className="overflow-hidden rounded-xl border border-border">
          {habits.map((h, idx) => (
            <React.Fragment key={h.id}>
              {idx > 0 ? <View className="h-px bg-border" /> : null}
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/habit-detail', params: { id: h.id } })
                }
                className="flex-row items-center gap-3 px-3 py-3 active:bg-accent">
                <View className="size-6 items-center justify-center rounded-full bg-violet-500/15">
                  <Icon as={RepeatIcon} size={14} className="text-violet-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-base">{h.title}</Text>
                  <Text variant="muted" className="text-xs">
                    {describeHabitFrequency(h)}
                  </Text>
                </View>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      ) : (
        <Text variant="muted" className="text-sm">
          No habits linked yet — wire up a system that drives this goal.
        </Text>
      )}

      <Button variant="outline" onPress={() => sheetRef.current?.present()}>
        <Icon as={PlusIcon} className="text-foreground" />
        <Text>Add habit</Text>
      </Button>

      <AttachHabitSheet
        sheetRef={sheetRef}
        goalId={goalId}
        habits={attachable}
        goals={allGoals}
        onPick={async (habit) => {
          await updateHabit(habit.id, { goalId });
          sheetRef.current?.dismiss();
        }}
      />
    </View>
    </BottomSheetModalProvider>
  );
}

function renderBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
    />
  );
}

function AttachHabitSheet({
  sheetRef,
  goalId,
  habits,
  goals,
  onPick,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  goalId: string;
  habits: Habit[];
  goals: { id: string; title: string }[];
  onPick: (habit: Habit) => void;
}) {
  const goalLookup = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const g of goals) map.set(g.id, g.title);
    return map;
  }, [goals]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: 'hsl(0 0% 100%)' }}
      handleIndicatorStyle={{ backgroundColor: 'rgba(120,120,120,0.4)' }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-4 pt-1">
          <Text className="text-lg font-semibold">Add habit</Text>
          <Text variant="muted" className="text-sm">
            Pick an existing one to attach, or create a new one.
          </Text>
        </View>
        <Pressable
          onPress={() => {
            sheetRef.current?.dismiss();
            router.push({ pathname: '/habit', params: { goalId } });
          }}
          className="flex-row items-center gap-3 px-5 py-3 active:bg-accent">
          <View className="size-9 items-center justify-center rounded-full bg-primary">
            <Icon as={PlusIcon} size={18} className="text-primary-foreground" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium">Create new habit</Text>
            <Text variant="muted" className="text-xs">
              Linked to this goal automatically
            </Text>
          </View>
        </Pressable>
        {habits.length > 0 ? (
          <>
            <View className="mt-2 h-px bg-border" />
            <View className="px-5 py-3">
              <Text variant="muted" className="text-xs uppercase tracking-wide">
                Existing habits
              </Text>
            </View>
          </>
        ) : null}
        {habits.map((h, idx) => {
          const currentGoal = h.goalId ? goalLookup.get(h.goalId) : null;
          return (
            <React.Fragment key={h.id}>
              {idx > 0 ? <View className="ml-16 h-px bg-border" /> : null}
              <Pressable
                onPress={() => onPick(h)}
                className="flex-row items-center gap-3 px-5 py-3 active:bg-accent">
                <View className="size-9 items-center justify-center rounded-full bg-violet-500/15">
                  <Icon as={RepeatIcon} size={18} className="text-violet-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-base">{h.title}</Text>
                  <Text variant="muted" className="text-xs">
                    {describeHabitFrequency(h)}
                    {currentGoal ? ` · currently: ${currentGoal}` : ''}
                  </Text>
                </View>
              </Pressable>
            </React.Fragment>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function describeHabitFrequency(h: Habit): string {
  const times =
    h.timesPerPeriod === 1 ? '' : ` · ${h.timesPerPeriod}× per ${h.frequencyKind === 'daily' ? 'day' : 'week'}`;
  if (h.frequencyKind === 'weekly') return `Weekly${times}`;
  if (h.daysOfWeek.length === 7) return `Daily${times}`;
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = h.daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((d) => labels[d])
    .join(', ');
  return `${days}${times}`;
}
