import { router } from 'expo-router';
import {
  CheckIcon,
  DiamondIcon,
  HeartIcon,
  RepeatIcon,
  TrendingUpIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, SectionList, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/entry-row';
import { Fab } from '@/components/fab';
import { JournalPreview } from '@/components/journal-preview';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { onCelebrate } from '@/lib/celebrate';
import { buildFeed, type FeedItem } from '@/lib/feed';
import { cn } from '@/lib/utils';
import { useEntriesStore } from '@/lib/stores/entries';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useSettingsStore } from '@/lib/stores/settings';
import { useTodosStore } from '@/lib/stores/todos';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ACTIVITY_META = {
  habit: { icon: RepeatIcon, bg: 'bg-purple-600/15', color: 'text-purple-600' },
  todo: { icon: CheckIcon, bg: 'bg-green-500/15', color: 'text-green-500' },
  milestone: { icon: DiamondIcon, bg: 'bg-orange-500/15', color: 'text-orange-500' },
} as const;

type FilterKey = 'all' | 'win' | 'gratitude' | 'confirmation' | 'habit' | 'todo' | 'milestone';

const FILTERS: { key: FilterKey; label: string; icon?: LucideIcon; color?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'win', label: 'Wins', icon: CheckIcon, color: 'text-green-600' },
  { key: 'gratitude', label: 'Gratitude', icon: HeartIcon, color: 'text-pink-600' },
  { key: 'confirmation', label: 'Confirmations', icon: TrendingUpIcon, color: 'text-indigo-600' },
  { key: 'habit', label: 'Habits', icon: RepeatIcon, color: 'text-purple-600' },
  { key: 'todo', label: 'Todos', icon: CheckIcon, color: 'text-green-500' },
  { key: 'milestone', label: 'Milestones', icon: DiamondIcon, color: 'text-orange-500' },
];

const FilterBar = React.memo(function FilterBar({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
      {FILTERS.map((f) => {
        const active = value === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            className={cn(
              'flex-row items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2',
              active && 'bg-accent'
            )}>
            {f.icon ? <Icon as={f.icon} size={14} className={f.color} /> : null}
            <Text className="text-sm font-medium leading-none">{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const ActivityRow = React.memo(function ActivityRow({
  item,
}: {
  item: Extract<FeedItem, { kind: 'habit' | 'todo' | 'milestone' }>;
}) {
  const meta = ACTIVITY_META[item.kind];
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <View className="flex-row items-center gap-3.5 px-4 py-2">
        <View className={cn('size-7 items-center justify-center rounded-full', meta.bg)}>
          <Icon as={meta.icon} size={17} className={meta.color} />
        </View>
        <Text className="flex-1 text-lg" numberOfLines={1}>
          {item.title}
        </Text>
      </View>
    </Animated.View>
  );
});

export default function JournalScreen() {
  const entries = useEntriesStore((state) => state.entries);
  const hydrated = useEntriesStore((state) => state.hydrated);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);
  const habits = useHabitsStore((s) => s.items);
  const completions = useHabitCompletionsStore((s) => s.items);
  const todos = useTodosStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);
  const showActivity = useSettingsStore((s) => s.showActivityInJournal);
  const cannon = React.useRef<ConfettiCannon>(null);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<FilterKey>('all');

  const sections = React.useMemo(() => {
    let items: FeedItem[] = entries.map((e) => ({
      id: `entry-${e.id}`,
      date: e.createdAt,
      kind: 'entry',
      entry: e,
    }));
    if (showActivity) {
      const habitTitle = new Map(habits.map((h) => [h.id, h.title]));
      for (const c of completions) {
        const title = habitTitle.get(c.habitId);
        if (title) {
          items.push({ id: `habit-${c.id}`, date: c.completedAt, kind: 'habit', title });
        }
      }
      for (const t of todos) {
        if (t.done && t.completedAt) {
          items.push({ id: `todo-${t.id}`, date: t.completedAt, kind: 'todo', title: t.title });
        }
      }
      for (const m of milestones) {
        if (m.done && m.completedAt) {
          items.push({
            id: `milestone-${m.id}`,
            date: m.completedAt,
            kind: 'milestone',
            title: m.title,
          });
        }
      }
    }
    if (filter !== 'all') {
      if (filter === 'habit' || filter === 'todo' || filter === 'milestone') {
        items = items.filter((i) => i.kind === filter);
      } else {
        items = items.filter((i) => i.kind === 'entry' && i.entry.type === filter);
      }
    }
    return buildFeed(items);
  }, [entries, habits, completions, todos, milestones, showActivity, filter]);

  const renderItem = React.useCallback(
    ({ item }: { item: FeedItem }) =>
      item.kind === 'entry' ? (
        <SwipeableRow
          onEdit={() => router.push({ pathname: '/new', params: { id: item.entry.id } })}
          onDelete={() => deleteEntry(item.entry.id)}
          deleteConfirmTitle="Delete entry">
          <EntryRow entry={item.entry} />
        </SwipeableRow>
      ) : (
        <ActivityRow item={item} />
      ),
    [deleteEntry]
  );

  const renderSectionHeader = React.useCallback(
    ({ section }: { section: { title: string } }) => (
      <View className="bg-background px-4 pb-1 pt-3">
        <Text variant="small" className="text-muted-foreground">
          {section.title}
        </Text>
      </View>
    ),
    []
  );

  React.useEffect(() => onCelebrate(() => cannon.current?.start()), []);

  const hasNothing = entries.length === 0 && (!showActivity ||
    (completions.length === 0 && todos.every((t) => !t.done) && milestones.every((m) => !m.done))
  );

  return (
    <SwipeableScreen route="index">
      <View className="flex-1">
      {hydrated && hasNothing ? (
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Text variant="h3" className="text-center">
            Start with one win today
          </Text>
          <View className="w-full max-w-md">
            <JournalPreview muted />
          </View>
          <Text variant="muted" className="text-center text-sm leading-5">
            Your wins, completed habits, todos, and milestones all land here.
          </Text>
        </View>
      ) : (
        <>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListEmptyComponent={
              <View className="px-8 py-16">
                <Text variant="muted" className="text-center text-sm">
                  Nothing matches this filter.
                </Text>
              </View>
            }
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        </>
      )}
      <Fab href="/new" />
      <View pointerEvents="none" className="absolute inset-0">
        <ConfettiCannon
          ref={cannon}
          count={120}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={2800}
        />
      </View>
      </View>
    </SwipeableScreen>
  );
}
