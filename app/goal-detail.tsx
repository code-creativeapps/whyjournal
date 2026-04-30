import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  AlignLeftIcon,
  CalendarIcon,
  CheckIcon,
  CrownIcon,
  DiamondIcon,
  GiftIcon,
  HeartIcon,
  ImagesIcon,
  PencilIcon,
  PlusIcon,
  RepeatIcon,
  RotateCcwIcon,
  TargetIcon,
  TrendingUpIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBorder } from '@/components/animated-border';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { ProjectRow } from '@/components/project-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { celebrateGoal, onCelebrateGoal } from '@/lib/celebrate';
import type { GoalImage } from '@/lib/goal-images/types';
import { GoalIconCircle } from '@/lib/goals/icon';
import { goalProgress } from '@/lib/goals/progress';
import { goalVelocity } from '@/lib/goals/velocity';
import type { Habit } from '@/lib/habits/types';
import { useGoalImagesStore } from '@/lib/stores/goal-images';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';
import { useTodosStore } from '@/lib/stores/todos';
import { cn } from '@/lib/utils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VELOCITY_DAYS = 14;

type GoalTab = 'description' | 'milestones' | 'projects' | 'systems';

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
  const allImages = useGoalImagesStore((state) => state.items);
  const allProjects = useProjectsStore((state) => state.items);

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

  const goalImages = React.useMemo(() => {
    if (!id) return [];
    return allImages
      .filter((img) => img.goalId === id)
      .slice()
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
  }, [allImages, id]);

  const projectsForGoal = React.useMemo(() => {
    if (!id) return [];
    return allProjects
      .filter((p) => p.goalId === id)
      .slice()
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.createdAt.localeCompare(b.createdAt)
      );
  }, [allProjects, id]);

  const tasksByProjectId = React.useMemo(() => {
    const map = new Map<string, typeof allTodos>();
    for (const t of allTodos) {
      if (!t.projectId) continue;
      const list = map.get(t.projectId) ?? [];
      list.push(t);
      map.set(t.projectId, list);
    }
    return map;
  }, [allTodos]);

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

  const insets = useSafeAreaInsets();
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
      <View className="flex-1">
        <View className="gap-3 px-6 pb-4 pt-6">
          <View className="items-center gap-3">
            <View>
              <GoalIconCircle icon={goal.icon} done={goal.done} size="lg" />
              {goal.isCornerstone ? (
                <View
                  pointerEvents="none"
                  className="absolute -right-1 -top-1">
                  <Icon as={CrownIcon} size={22} className="text-amber-500" />
                </View>
              ) : null}
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
        </View>

        <View className="px-6 pb-5">
          <SegmentedTab value={tab} onChange={setTab} />
        </View>

        <TabPager
          tab={tab}
          onTabChange={setTab}
          pages={[
            <DescriptionTab
              key="description"
              goal={goal}
              velocity={velocity}
              images={goalImages}
              onEdit={() =>
                router.push({ pathname: '/goal', params: { id: goal.id } })
              }
            />,
            <MilestonesTab
              key="milestones"
              goalId={goal.id}
              milestones={milestones}
              progress={progress}
              hasMilestones={hasMilestones}
            />,
            <ProjectsTab
              key="projects"
              goalId={goal.id}
              projects={projectsForGoal}
              milestones={milestones}
              tasksByProjectId={tasksByProjectId}
            />,
            <SystemsTab
              key="systems"
              goalId={goal.id}
              habits={habitsForGoal}
            />,
          ]}
        />

        <View
          className="border-t border-border bg-background px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
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
      </View>
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
  { value: 'projects', label: 'Projects' },
  { value: 'systems', label: 'Systems' },
];

function TabPager({
  tab,
  onTabChange,
  pages,
}: {
  tab: GoalTab;
  onTabChange: (next: GoalTab) => void;
  pages: React.ReactNode[];
}) {
  const scrollRef = React.useRef<ScrollView>(null);
  const tabIndex = TABS.findIndex((t) => t.value === tab);

  // Keep horizontal scroll position in sync when the user taps a segmented
  // tab. Without this, the pager would stay on the previous page.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      x: tabIndex * SCREEN_WIDTH,
      animated: true,
    });
  }, [tabIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onMomentumScrollEnd={(e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        const next = TABS[idx]?.value;
        if (next && next !== tab) onTabChange(next);
      }}
      style={{ flex: 1 }}>
      {pages.map((node, i) => (
        <View key={i} style={{ width: SCREEN_WIDTH }} className="flex-1">
          {node}
        </View>
      ))}
    </ScrollView>
  );
}

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
  images,
  onEdit,
}: {
  goal: { body?: string; why?: string; reward?: string };
  velocity: { date: string; count: number }[];
  images: GoalImage[];
  onEdit: () => void;
}) {
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerClassName="gap-6 px-6 pb-6">
      {images.length > 0 ? (
        <VisionBoard images={images} onTap={(i) => setLightboxIndex(i)} />
      ) : null}

      <View className="gap-1.5">
        <SectionLabel
          icon={AlignLeftIcon}
          label="Vivid description"
          iconClass="text-sky-500"
        />
        {goal.body ? (
          <Text className="text-base leading-6">{goal.body}</Text>
        ) : (
          <EmptyFieldPrompt
            text="Paint the picture of what done looks like."
            onPress={onEdit}
          />
        )}
      </View>

      <View className="gap-1.5">
        <SectionLabel
          icon={HeartIcon}
          label="Why it matters"
          iconClass="text-rose-500"
        />
        {goal.why ? (
          <Text className="text-base leading-6">{goal.why}</Text>
        ) : (
          <EmptyFieldPrompt
            text="What changes once you get there?"
            onPress={onEdit}
          />
        )}
      </View>

      <View className="gap-1.5">
        <SectionLabel
          icon={GiftIcon}
          label="Reward"
          iconClass="text-amber-500"
        />
        {goal.reward ? (
          <View className="flex-row items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <Icon as={GiftIcon} size={18} className="text-amber-500" />
            <Text className="flex-1 text-base leading-6">{goal.reward}</Text>
          </View>
        ) : (
          <Pressable
            onPress={onEdit}
            className="flex-row items-start gap-3 rounded-xl border border-dashed border-border p-4 active:bg-accent">
            <Icon as={GiftIcon} size={18} className="text-muted-foreground" />
            <Text variant="muted" className="flex-1 text-base italic leading-6">
              How will you celebrate? Tap to add.
            </Text>
          </Pressable>
        )}
      </View>

      <VelocityChart days={velocity} />

      <Lightbox
        images={images}
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </ScrollView>
  );
}

function EmptyFieldPrompt({
  text,
  onPress,
}: {
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-md border border-dashed border-border p-3 active:bg-accent">
      <Text variant="muted" className="text-base italic leading-6">
        {text} Tap to add.
      </Text>
    </Pressable>
  );
}

const VISION_BOARD_GAP = 8;
const VISION_BOARD_TILE = 132;

function VisionBoard({
  images,
  onTap,
}: {
  images: GoalImage[];
  onTap: (index: number) => void;
}) {
  return (
    <View className="-mx-6 gap-2">
      <View className="px-6">
        <SectionLabel
          icon={ImagesIcon}
          label="Vision board"
          iconClass="text-violet-500"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          gap: VISION_BOARD_GAP,
        }}>
        {images.map((img, idx) => (
          <Pressable
            key={img.id}
            onPress={() => onTap(idx)}
            style={{ width: VISION_BOARD_TILE, height: VISION_BOARD_TILE }}
            className="overflow-hidden rounded-xl active:opacity-80">
            <Image
              source={{ uri: img.url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={120}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Lightbox({
  images,
  openIndex,
  onClose,
}: {
  images: GoalImage[];
  openIndex: number | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const width = SCREEN_WIDTH;
  const [currentIndex, setCurrentIndex] = React.useState(openIndex ?? 0);

  React.useEffect(() => {
    if (openIndex !== null) setCurrentIndex(openIndex);
  }, [openIndex]);

  const visible = openIndex !== null;
  const currentAttribution =
    visible && images[currentIndex] ? images[currentIndex].attribution : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <FlatList
          data={images}
          keyExtractor={(img) => img.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={openIndex ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            if (idx !== currentIndex) setCurrentIndex(idx);
          }}
          renderItem={({ item }) => (
            <View style={{ width, flex: 1 }}>
              <Image
                source={{ uri: item.url }}
                style={{ flex: 1 }}
                contentFit="contain"
                transition={120}
              />
            </View>
          )}
        />
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={{ top: insets.top + 6 }}
          className="absolute right-3 size-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25">
          <Icon as={XIcon} size={20} className="text-white" />
        </Pressable>
        {currentAttribution ? (
          <View
            style={{ bottom: insets.bottom + 12 }}
            className="absolute left-0 right-0 items-center px-6">
            <Text className="text-center text-xs text-white/70">{currentAttribution}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function SectionLabel({
  icon,
  label,
  iconClass,
}: {
  icon: LucideIcon;
  label: string;
  iconClass?: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon as={icon} size={13} className={iconClass ?? 'text-muted-foreground'} />
      <Text variant="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
    </View>
  );
}

function VelocityChart({ days }: { days: { date: string; count: number }[] }) {
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <View className="gap-2">
      <SectionLabel
        icon={TrendingUpIcon}
        label={`Velocity · last ${days.length} days`}
        iconClass="text-emerald-500"
      />
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
    <View className="flex-1">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerClassName="gap-4 px-6 pb-4">
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
                        m.done ? 'bg-green-500' : 'bg-orange-500/15'
                      )}>
                      <Icon
                        as={DiamondIcon}
                        size={14}
                        className={m.done ? 'text-white' : 'text-orange-500'}
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
      </ScrollView>

      <View className="border-t border-border px-6 pb-3 pt-3">
        <Button
          variant="outline"
          onPress={() =>
            router.push({ pathname: '/milestone', params: { goalId } })
          }>
          <Icon as={PlusIcon} className="text-foreground" />
          <Text>Add milestone</Text>
        </Button>
      </View>
    </View>
  );
}

function ProjectsTab({
  goalId,
  projects,
  milestones,
  tasksByProjectId,
}: {
  goalId: string;
  projects: ReturnType<typeof useProjectsStore.getState>['items'];
  milestones: ReturnType<typeof useMilestonesStore.getState>['items'];
  tasksByProjectId: Map<string, ReturnType<typeof useTodosStore.getState>['items']>;
}) {
  const milestoneById = React.useMemo(() => {
    const map = new Map<string, (typeof milestones)[number]>();
    for (const m of milestones) map.set(m.id, m);
    return map;
  }, [milestones]);

  return (
    <View className="flex-1">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 px-6 pb-4">
        {projects.length > 0 ? (
          <View className="overflow-hidden rounded-xl border border-border">
            {projects.map((p, idx) => (
              <React.Fragment key={p.id}>
                {idx > 0 ? <View className="h-px bg-border" /> : null}
                <ProjectRow
                  project={p}
                  milestone={
                    p.milestoneId ? milestoneById.get(p.milestoneId) : undefined
                  }
                  tasks={tasksByProjectId.get(p.id) ?? []}
                />
              </React.Fragment>
            ))}
          </View>
        ) : (
          <Text variant="muted" className="text-sm">
            No projects yet — break this goal down into the workstreams that
            get it done.
          </Text>
        )}
      </ScrollView>

      <View className="border-t border-border px-6 pb-3 pt-3">
        <Button
          variant="outline"
          onPress={() =>
            router.push({ pathname: '/project', params: { goalId } })
          }>
          <Icon as={PlusIcon} className="text-foreground" />
          <Text>Add project</Text>
        </Button>
      </View>
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
      <View className="flex-1">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerClassName="gap-4 px-6 pb-4">
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
        </ScrollView>

        <View className="border-t border-border px-6 pb-3 pt-3">
          <Button variant="outline" onPress={() => sheetRef.current?.present()}>
            <Icon as={PlusIcon} className="text-foreground" />
            <Text>Add habit</Text>
          </Button>
        </View>

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
