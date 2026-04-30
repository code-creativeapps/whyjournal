import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CornerDownRightIcon,
  CrownIcon,
  DiamondIcon,
  GripVerticalIcon,
  TargetIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FabRow } from '@/components/fab-row';
import { SearchHeaderButton } from '@/components/search-header-button';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { GoalIconCircle } from '@/lib/goals/icon';
import { goalProgress } from '@/lib/goals/progress';
import type { Goal } from '@/lib/goals/types';
import { useGoalsStore } from '@/lib/stores/goals';
import type { Milestone } from '@/lib/milestones/types';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { cn } from '@/lib/utils';

type Tab = 'goals' | 'milestones';

export default function GoalsScreen() {
  const rawItems = useGoalsStore((state) => state.items);
  const hydrated = useGoalsStore((state) => state.hydrated);
  const deleteGoal = useGoalsStore((state) => state.deleteItem);
  const updateGoal = useGoalsStore((state) => state.updateItem);
  const milestones = useMilestonesStore((state) => state.items);
  const insets = useSafeAreaInsets();

  // User-controlled order: goals.position asc, then newest first as a
  // tiebreaker so newly-created goals (default position 0) land at the
  // top of their bucket until the user reorders.
  const items = React.useMemo(
    () =>
      rawItems
        .slice()
        .sort(
          (a, b) =>
            (a.position ?? 0) - (b.position ?? 0) ||
            b.createdAt.localeCompare(a.createdAt)
        ),
    [rawItems]
  );

  // Optimistic local copy of `items` so DraggableFlatList doesn't flicker
  // while the N sequential `position` updates resolve. We snap it on drop and
  // re-sync whenever `items` (the sorted upstream) actually changes.
  const [localGoals, setLocalGoals] = React.useState<Goal[]>(items);
  React.useEffect(() => {
    setLocalGoals(items);
  }, [items]);

  const handleReorder = React.useCallback(
    async (next: Goal[]) => {
      setLocalGoals(next);
      const updates: Array<Promise<unknown>> = [];
      for (let i = 0; i < next.length; i++) {
        const g = next[i];
        if ((g.position ?? 0) !== i) {
          updates.push(updateGoal(g.id, { position: i }));
        }
      }
      try {
        await Promise.all(updates);
      } catch {
        // Roll back to the upstream order if any update failed.
        setLocalGoals(items);
      }
    },
    [updateGoal, items]
  );

  const [tab, setTab] = React.useState<Tab>('goals');
  const [reorderMode, setReorderMode] = React.useState(false);
  // Per-goal expand state lifted to the screen so it survives tab switches.
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const toggleExpanded = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Drop expanded groups when entering reorder mode — the simpler list keeps
  // the drag visually clean and there's no need to expand mid-reorder.
  React.useEffect(() => {
    if (reorderMode) setExpanded(new Set());
  }, [reorderMode]);

  const milestonesByGoal = React.useMemo(() => {
    const map = new Map<string, Milestone[]>();
    for (const m of milestones) {
      const existing = map.get(m.goalId) ?? [];
      existing.push(m);
      map.set(m.goalId, existing);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.createdAt.localeCompare(b.createdAt)
      );
    }
    return map;
  }, [milestones]);

  const goalsById = React.useMemo(() => {
    const map = new Map<string, Goal>();
    for (const g of items) map.set(g.id, g);
    return map;
  }, [items]);

  const sortedMilestones = React.useMemo(() => {
    const out: Milestone[] = [];
    for (const g of items) {
      const list = milestonesByGoal.get(g.id);
      if (list) out.push(...list);
    }
    for (const m of milestones) {
      if (!goalsById.has(m.goalId)) out.push(m);
    }
    return out;
  }, [items, milestones, milestonesByGoal, goalsById]);

  // True when at least one goal with milestones is expanded. Tap the toggle
  // to either fold everything down or open it all up.
  const goalsWithMilestones = React.useMemo(
    () => items.filter((g) => (milestonesByGoal.get(g.id)?.length ?? 0) > 0),
    [items, milestonesByGoal]
  );
  const anyExpanded = goalsWithMilestones.some((g) => expanded.has(g.id));
  const onToggleAll = React.useCallback(() => {
    if (anyExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(goalsWithMilestones.map((g) => g.id)));
    }
  }, [anyExpanded, goalsWithMilestones]);

  // Re-register the screen header so the toggle sits next to the global
  // search button. We have to override `headerRight` per-screen because the
  // drawer-level default (in (drawer)/_layout.tsx) only shows search.
  const navigation = useNavigation();
  const showToggle = tab === 'goals' && goalsWithMilestones.length > 0;
  const showReorder = tab === 'goals' && items.length > 1;
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-1 pr-1">
          {showReorder ? (
            <Pressable
              onPress={() => setReorderMode((v) => !v)}
              hitSlop={8}
              className={cn(
                'size-9 items-center justify-center rounded-full',
                reorderMode ? 'bg-accent' : 'active:bg-accent'
              )}>
              <Icon
                as={ArrowUpDownIcon}
                size={20}
                className={reorderMode ? 'text-primary' : 'text-foreground'}
              />
            </Pressable>
          ) : null}
          {showToggle && !reorderMode ? (
            <Pressable
              onPress={onToggleAll}
              hitSlop={8}
              className="size-9 items-center justify-center rounded-full active:bg-accent">
              <Icon
                as={anyExpanded ? ChevronsDownUpIcon : ChevronsUpDownIcon}
                size={20}
                className="text-foreground"
              />
            </Pressable>
          ) : null}
          <SearchHeaderButton />
        </View>
      ),
    });
  }, [navigation, showToggle, showReorder, reorderMode, anyExpanded, onToggleAll]);

  return (
    <SwipeableScreen route="goals">
      <View className="flex-1">
        <SegmentedTab value={tab} onChange={setTab} />
        <View key={tab} className="flex-1">
          {tab === 'goals' ? (
            <>
              {reorderMode ? (
                <View className="mt-3 flex-row items-center justify-between border-y border-border bg-muted px-4 py-2">
                  <Text variant="muted" className="text-xs">
                    Drag the handles to reorder.
                  </Text>
                  <Pressable
                    onPress={() => setReorderMode(false)}
                    hitSlop={8}
                    className="rounded-full px-2 py-1 active:bg-accent">
                    <Text className="text-sm font-semibold text-primary">Done</Text>
                  </Pressable>
                </View>
              ) : null}
              <GoalsList
                goals={localGoals}
                hydrated={hydrated}
                milestonesByGoal={milestonesByGoal}
                expanded={expanded}
                onToggleExpand={toggleExpanded}
                onDeleteGoal={(id) => deleteGoal(id)}
                onReorder={handleReorder}
                reorderMode={reorderMode}
                paddingBottom={insets.bottom + 96}
              />
            </>
          ) : (
            <MilestonesList
              milestones={sortedMilestones}
              goalsById={goalsById}
              paddingBottom={insets.bottom + 96}
            />
          )}
        </View>
        <FabRow href="/goal" />
      </View>
    </SwipeableScreen>
  );
}

function SegmentedTab({ value, onChange }: { value: Tab; onChange: (v: Tab) => void }) {
  return (
    <View className="mx-4 mt-3 flex-row rounded-full bg-muted p-1">
      {(['goals', 'milestones'] as Tab[]).map((t) => {
        const active = value === t;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            className={cn(
              'flex-1 items-center rounded-full py-1.5',
              active && 'bg-background shadow-sm'
            )}>
            <Text
              className={cn(
                'text-sm font-medium capitalize',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GoalsList({
  goals,
  hydrated,
  milestonesByGoal,
  expanded,
  onToggleExpand,
  onDeleteGoal,
  onReorder,
  reorderMode,
  paddingBottom,
}: {
  goals: Goal[];
  hydrated: boolean;
  milestonesByGoal: Map<string, Milestone[]>;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onReorder: (next: Goal[]) => void;
  reorderMode: boolean;
  paddingBottom: number;
}) {
  if (hydrated && goals.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text variant="h3" className="text-center">
          Goals
        </Text>
        <Text variant="muted" className="text-center">
          What you&apos;re working on now, big or small.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Goal>) => (
    <ScaleDecorator>
      <View>
        {!isActive && (getIndex() ?? 0) > 0 ? <View className="h-px bg-border" /> : null}
        {reorderMode ? (
          <View
            className={cn(
              'flex-row items-center bg-background',
              isActive && 'bg-accent'
            )}>
            <View className="flex-1">
              <GoalListItem
                goal={item}
                milestones={milestonesByGoal.get(item.id) ?? []}
                expanded={false}
                onToggleExpand={() => undefined}
                isCornerstone={Boolean(item.isCornerstone)}
                reorderMode
              />
            </View>
            <Pressable
              onLongPress={drag}
              delayLongPress={120}
              hitSlop={8}
              className="px-3 py-3">
              <Icon
                as={GripVerticalIcon}
                size={20}
                className="text-muted-foreground"
              />
            </Pressable>
          </View>
        ) : (
          <SwipeableRow
            onEdit={() => router.push({ pathname: '/goal', params: { id: item.id } })}
            onDelete={() => onDeleteGoal(item.id)}
            deleteConfirmTitle="Delete goal"
            deleteConfirmBody="Linked milestones will be removed too. This cannot be undone.">
            <GoalListItem
              goal={item}
              milestones={milestonesByGoal.get(item.id) ?? []}
              expanded={expanded.has(item.id)}
              onToggleExpand={() => onToggleExpand(item.id)}
              isCornerstone={Boolean(item.isCornerstone)}
            />
          </SwipeableRow>
        )}
      </View>
    </ScaleDecorator>
  );

  return (
    <DraggableFlatList
      data={goals}
      keyExtractor={(item) => item.id}
      onDragEnd={({ data }) => onReorder(data)}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom }}
      activationDistance={12}
    />
  );
}

function GoalListItem({
  goal,
  milestones,
  expanded,
  onToggleExpand,
  isCornerstone,
  reorderMode,
}: {
  goal: Goal;
  milestones: Milestone[];
  expanded: boolean;
  onToggleExpand: () => void;
  isCornerstone?: boolean;
  reorderMode?: boolean;
}) {
  const hasMilestones = milestones.length > 0;
  const progress = goalProgress(goal, milestones);
  const subtitleParts: string[] = [];
  if (milestones.length > 0) {
    subtitleParts.push(`${progress.done} / ${progress.total} milestones`);
  }
  if (goal.targetDate) {
    subtitleParts.push(goal.targetDate);
  }
  const subtitle = subtitleParts.join(' · ') || undefined;

  // While reordering, the row is a draggable token — no nav, no chevron, no
  // expanded sub-rows. The grip handle on the right (rendered by the parent)
  // is the only interactive surface.
  const RowBody = (
    <View className="flex-row items-center gap-3 px-4 py-2">
      <View>
        <GoalIconCircle icon={goal.icon} done={goal.done} size="sm" />
        {isCornerstone ? (
          <View
            pointerEvents="none"
            className="absolute -right-1.5 -top-1.5">
            <Icon as={CrownIcon} size={12} className="text-amber-500" />
          </View>
        ) : null}
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            'text-base',
            goal.done && 'text-muted-foreground line-through'
          )}
          numberOfLines={1}>
          {goal.title}
        </Text>
        {subtitle ? (
          <Text variant="muted" className="text-xs">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (reorderMode) {
    return RowBody;
  }

  return (
    <View>
      <View className="flex-row items-center">
        <Pressable
          onPress={() =>
            router.push({ pathname: '/goal-detail', params: { id: goal.id } })
          }
          className="flex-1">
          {RowBody}
        </Pressable>
        {/* Chevron sits in its own touch zone — only this region toggles expansion.
            Hidden when there are no milestones to expand. No press feedback —
            no background change, no opacity dip. */}
        {hasMilestones ? (
          <Pressable
            onPress={onToggleExpand}
            hitSlop={6}
            className="items-center justify-center self-stretch px-4">
            <Icon
              as={expanded ? ChevronUpIcon : ChevronDownIcon}
              size={18}
              className="text-muted-foreground"
            />
          </Pressable>
        ) : null}
      </View>

      {expanded
        ? milestones.map((m) => (
            <React.Fragment key={m.id}>
              <View className="h-px bg-border" />
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/milestone-detail',
                    params: { id: m.id },
                  })
                }
                className="flex-row items-center gap-2 py-2 pl-6 pr-4 active:bg-accent">
                <Icon
                  as={CornerDownRightIcon}
                  size={14}
                  className="text-muted-foreground"
                />
                <View
                  className={cn(
                    'ml-1 size-6 items-center justify-center rounded-full',
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
                    'flex-1 text-sm',
                    m.done && 'text-muted-foreground line-through'
                  )}>
                  {m.title}
                </Text>
              </Pressable>
            </React.Fragment>
          ))
        : null}
    </View>
  );
}

function MilestonesList({
  milestones,
  goalsById,
  paddingBottom,
}: {
  milestones: Milestone[];
  goalsById: Map<string, Goal>;
  paddingBottom: number;
}) {
  if (milestones.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text variant="muted" className="text-center">
          No milestones yet. Add some from a goal.
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={milestones}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => {
        const goal = goalsById.get(item.goalId);
        return (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/milestone-detail',
                params: { id: item.id },
              })
            }
            className="active:bg-accent">
            <View className="flex-row items-center gap-3 px-4 py-2">
              <View
                className={cn(
                  'size-6 items-center justify-center rounded-full',
                  item.done ? 'bg-green-500' : 'bg-orange-500/15'
                )}>
                <Icon
                  as={DiamondIcon}
                  size={14}
                  className={item.done ? 'text-white' : 'text-orange-500'}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={cn(
                    'text-base',
                    item.done && 'text-muted-foreground line-through'
                  )}
                  numberOfLines={1}>
                  {item.title}
                </Text>
                {goal ? (
                  <Text variant="muted" className="text-xs" numberOfLines={1}>
                    {goal.title}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      }}
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      contentContainerStyle={{ paddingBottom }}
    />
  );
}
