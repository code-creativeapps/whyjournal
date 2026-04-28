import { Stack, router } from 'expo-router';
import {
  BookOpenIcon,
  CheckSquareIcon,
  QuoteIcon,
  RepeatIcon,
  StarIcon,
  TargetIcon,
  TrophyIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { searchAll, type SearchHit, type SearchKind } from '@/lib/search';
import { useAffirmationsStore } from '@/lib/stores/affirmations';
import { useBucketStore } from '@/lib/stores/bucket';
import { useEntriesStore } from '@/lib/stores/entries';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitsStore } from '@/lib/stores/habits';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useTodosStore } from '@/lib/stores/todos';
import { useTrophiesStore } from '@/lib/stores/trophies';

const KIND_VISUAL: Record<
  SearchKind,
  { icon: LucideIcon; bgClass: string; iconColorClass: string; label: string }
> = {
  entry: {
    icon: BookOpenIcon,
    bgClass: 'bg-indigo-500/15',
    iconColorClass: 'text-indigo-500',
    label: 'Entry',
  },
  todo: {
    icon: CheckSquareIcon,
    bgClass: 'bg-green-500/15',
    iconColorClass: 'text-green-500',
    label: 'Todo',
  },
  goal: {
    icon: TargetIcon,
    bgClass: 'bg-red-500/15',
    iconColorClass: 'text-red-500',
    label: 'Goal',
  },
  milestone: {
    icon: TargetIcon,
    bgClass: 'bg-pink-400/15',
    iconColorClass: 'text-pink-400',
    label: 'Milestone',
  },
  habit: {
    icon: RepeatIcon,
    bgClass: 'bg-violet-500/15',
    iconColorClass: 'text-violet-500',
    label: 'Habit',
  },
  affirmation: {
    icon: QuoteIcon,
    bgClass: 'bg-sky-500/15',
    iconColorClass: 'text-sky-500',
    label: 'Reminder',
  },
  bucket: {
    icon: StarIcon,
    bgClass: 'bg-yellow-500/15',
    iconColorClass: 'text-yellow-500',
    label: 'Bucket',
  },
  trophy: {
    icon: TrophyIcon,
    bgClass: 'bg-amber-500/15',
    iconColorClass: 'text-amber-500',
    label: 'Trophy',
  },
};

export default function SearchScreen() {
  const [query, setQuery] = React.useState('');
  const insets = useSafeAreaInsets();

  const entries = useEntriesStore((s) => s.entries);
  const affirmations = useAffirmationsStore((s) => s.items);
  const bucketItems = useBucketStore((s) => s.items);
  const goals = useGoalsStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);
  const habits = useHabitsStore((s) => s.items);
  const todos = useTodosStore((s) => s.items);
  const trophies = useTrophiesStore((s) => s.items);

  const results = React.useMemo(
    () =>
      searchAll(query, {
        entries,
        affirmations,
        bucketItems,
        goals,
        milestones,
        habits,
        todos,
        trophies,
      }),
    [query, entries, affirmations, bucketItems, goals, milestones, habits, todos, trophies]
  );

  function openHit(hit: SearchHit) {
    // Expo Router's typed routes can't infer the union from a string variable;
    // every pathname we emit is a real route registered in app/_layout.tsx.
    router.replace({ pathname: hit.pathname as never, params: hit.params });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-background">
        <View className="px-4 pb-3 pt-3">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search across all items"
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        {query.trim().length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text variant="muted" className="text-center text-sm">
              Type to search journal entries, todos, goals, milestones, habits, reminders, bucket
              items, and trophies.
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text variant="muted" className="text-center text-sm">
              No matches.
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(h) => `${h.kind}:${h.id}`}
            renderItem={({ item }) => <SearchRow hit={item} onPress={openHit} />}
            ItemSeparatorComponent={() => <View className="ml-16 h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </>
  );
}

function SearchRow({
  hit,
  onPress,
}: {
  hit: SearchHit;
  onPress: (hit: SearchHit) => void;
}) {
  const v = KIND_VISUAL[hit.kind];
  return (
    <Pressable
      onPress={() => onPress(hit)}
      className="flex-row items-center gap-3 px-5 py-3 active:bg-accent">
      <View
        className={`size-9 items-center justify-center rounded-full ${v.bgClass}`}>
        <Icon as={v.icon} size={18} className={v.iconColorClass} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium" numberOfLines={1}>
          {hit.title}
        </Text>
        <Text variant="muted" className="text-xs" numberOfLines={1}>
          {hit.subtitle ? `${v.label} · ${hit.subtitle}` : v.label}
        </Text>
      </View>
    </Pressable>
  );
}
