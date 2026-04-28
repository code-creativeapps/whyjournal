import { format, subDays } from 'date-fns';
import { Stack, router } from 'expo-router';
import { FlameIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ViewMode = 'heatmap' | 'stream' | 'grid';

const VIEW_LABELS: Record<ViewMode, string> = {
  heatmap: 'Heatmap',
  stream: 'Bars',
  grid: 'Grid',
};

type MockHabit = {
  id: string;
  title: string;
  short: string;
  /** Tailwind color name used to build classes for this habit's marker. */
  color: 'violet' | 'sky' | 'pink' | 'green' | 'amber' | 'red';
  streak: number;
  /** Daily completion counts, oldest to newest. Length 180. */
  history: number[];
  /** Per-day target — used to map count → intensity bucket. */
  target: number;
};

const TODAY_INDEX = 179; // Last entry in history is today.
const HISTORY_DAYS = 180;
const WEEKS = 26; // ~6 months

const HABIT_BG: Record<MockHabit['color'], string[]> = {
  // 5 intensity buckets: 0 (not done), 1, 2, 3, 4 (target hit or beyond)
  violet: ['bg-muted', 'bg-violet-500/25', 'bg-violet-500/50', 'bg-violet-500/75', 'bg-violet-500'],
  sky: ['bg-muted', 'bg-sky-500/25', 'bg-sky-500/50', 'bg-sky-500/75', 'bg-sky-500'],
  pink: ['bg-muted', 'bg-pink-500/25', 'bg-pink-500/50', 'bg-pink-500/75', 'bg-pink-500'],
  green: ['bg-muted', 'bg-green-500/25', 'bg-green-500/50', 'bg-green-500/75', 'bg-green-500'],
  amber: ['bg-muted', 'bg-amber-500/25', 'bg-amber-500/50', 'bg-amber-500/75', 'bg-amber-500'],
  red: ['bg-muted', 'bg-red-500/25', 'bg-red-500/50', 'bg-red-500/75', 'bg-red-500'],
};

const HABIT_DOT: Record<MockHabit['color'], string> = {
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
  pink: 'bg-pink-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeHistory(seed: number, completionRate: number, maxPerDay: number, dayFilter?: (dow: number) => boolean): number[] {
  const r = rand(seed);
  const out: number[] = [];
  for (let i = 0; i < HISTORY_DAYS; i++) {
    // Day-of-week of (i) days ago from today. We don't anchor to a real date —
    // use i % 7 as a stand-in. dow=0..6.
    const dow = (i + 4) % 7; // arbitrary phase so weekends scatter
    if (dayFilter && !dayFilter(dow)) {
      out.push(0);
      continue;
    }
    if (r() < completionRate) {
      const n = Math.min(maxPerDay, 1 + Math.floor(r() * maxPerDay));
      out.push(n);
    } else {
      out.push(0);
    }
  }
  return out;
}

const MOCK_HABITS: MockHabit[] = [
  {
    id: 'm1',
    title: 'Drink 8 glasses of water',
    short: 'Water',
    color: 'sky',
    streak: 23,
    target: 8,
    history: makeHistory(7, 0.92, 8),
  },
  {
    id: 'm2',
    title: 'Read 20 minutes',
    short: 'Read',
    color: 'violet',
    streak: 12,
    target: 1,
    history: makeHistory(13, 0.78, 1),
  },
  {
    id: 'm3',
    title: 'Exercise',
    short: 'Exercise',
    color: 'red',
    streak: 5,
    target: 1,
    history: makeHistory(21, 0.85, 1, (dow) => dow === 1 || dow === 3 || dow === 5),
  },
  {
    id: 'm4',
    title: 'Meditate',
    short: 'Meditate',
    color: 'pink',
    streak: 7,
    target: 1,
    history: makeHistory(33, 0.7, 1),
  },
  {
    id: 'm5',
    title: 'Journal',
    short: 'Journal',
    color: 'amber',
    streak: 4,
    target: 1,
    history: makeHistory(41, 0.65, 1),
  },
  {
    id: 'm6',
    title: 'Run 5k',
    short: 'Run',
    color: 'green',
    streak: 3,
    target: 1,
    history: makeHistory(51, 0.55, 1, (dow) => dow === 0 || dow === 6),
  },
];

function intensity(count: number, target: number): number {
  if (count <= 0) return 0;
  const ratio = count / target;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

export default function HabitsTrendsLabScreen() {
  const [view, setView] = React.useState<ViewMode>('heatmap');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Trend ideas',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-background">
        <View
          style={{ zIndex: 10 }}
          className="bg-background px-4 pb-2 pt-3">
          <View className="flex-row rounded-full bg-muted p-1">
            {(['heatmap', 'stream', 'grid'] as ViewMode[]).map((v) => {
              const active = v === view;
              return (
                <Pressable
                  key={v}
                  onPress={() => setView(v)}
                  className={cn(
                    'flex-1 items-center rounded-full py-1.5',
                    active && 'bg-background shadow-sm'
                  )}>
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      active ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                    {VIEW_LABELS[v]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View key={view} className="flex-1">
          {view === 'heatmap' ? (
            <HeatmapView />
          ) : view === 'grid' ? (
            <DayStreamView shape="square" />
          ) : (
            <DayStreamView shape="bar" />
          )}
        </View>
      </View>
    </>
  );
}

// ─── Idea 1: GitHub-style commit heatmap, one per habit ─────────────────────

function HeatmapView() {
  return (
    <ScrollView contentContainerClassName="gap-4 px-3 py-4 pb-12">
      <Text variant="muted" className="text-center text-xs">
        Last 6 months · GitHub-style
      </Text>
      {MOCK_HABITS.map((h) => (
        <HabitHeatmap key={h.id} habit={h} />
      ))}
    </ScrollView>
  );
}

function HabitHeatmap({ habit }: { habit: MockHabit }) {
  // Build a 7×WEEKS grid. Row 0 = Sun, Row 6 = Sat.
  // History is oldest→newest. Last entry is "today". We map index i in history
  // to a column based on weeks ago and a row based on dow.
  // For mock simplicity: column = floor(i / 7) measured from oldest, row = i % 7
  // (since we don't anchor to real dates). 26 weeks * 7 days = 182 cells, we
  // have 180 entries — pad the leading 2 cells as muted.
  const cells: { intensity: number }[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const histIdx = i - (WEEKS * 7 - HISTORY_DAYS);
    if (histIdx < 0) {
      cells.push({ intensity: 0 });
    } else {
      cells.push({ intensity: intensity(habit.history[histIdx], habit.target) });
    }
  }

  // Lay out as columns of 7 (week column).
  const columns: { intensity: number }[][] = [];
  for (let c = 0; c < WEEKS; c++) {
    const col: { intensity: number }[] = [];
    for (let r = 0; r < 7; r++) {
      col.push(cells[c * 7 + r]);
    }
    columns.push(col);
  }

  return (
    <View className="rounded-2xl border border-border bg-background p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
          {habit.title}
        </Text>
        <View className="flex-row items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5">
          <Icon as={FlameIcon} size={12} className="text-orange-500" />
          <Text variant="small" className="text-xs font-semibold text-orange-600">
            {habit.streak}d
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row gap-[2px]">
        {columns.map((col, ci) => (
          <View key={ci} className="flex-1 gap-[2px]">
            {col.map((cell, ri) => (
              <View
                key={ri}
                className={cn('aspect-square rounded-[2px]', HABIT_BG[habit.color][cell.intensity])}
              />
            ))}
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row items-center justify-end gap-1">
        <Text variant="muted" className="mr-1 text-[10px]">
          Less
        </Text>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <View key={lvl} className={cn('size-2.5 rounded-[2px]', HABIT_BG[habit.color][lvl])} />
        ))}
        <Text variant="muted" className="ml-1 text-[10px]">
          More
        </Text>
      </View>
    </View>
  );
}

// ─── Idea 2: Vertical day-by-day stream across all habits ────────────────────

type CellShape = 'bar' | 'square';

function DayStreamView({ shape }: { shape: CellShape }) {
  const today = React.useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();

  // Build day rows from history. Index 0 = today, index n = n days ago.
  const rows = React.useMemo(() => {
    const out: { dayAgo: number; date: Date; perHabit: number[] }[] = [];
    for (let dayAgo = 0; dayAgo < HISTORY_DAYS; dayAgo++) {
      const histIdx = TODAY_INDEX - dayAgo;
      out.push({
        dayAgo,
        date: subDays(today, dayAgo),
        perHabit: MOCK_HABITS.map((h) => h.history[histIdx]),
      });
    }
    return out;
  }, [today]);

  return (
    <View className="flex-1">
      {/* Pinned column header — names align with the bars below */}
      <View className="border-b border-border bg-background px-4 py-2">
        <View className="flex-row items-end gap-3">
          <View className="w-24" />
          <View className="flex-1 flex-row gap-1.5">
            {MOCK_HABITS.map((h) => (
              <View key={h.id} className="flex-1 items-center">
                <Text variant="muted" className="text-[10px]" numberOfLines={1}>
                  {h.short}
                </Text>
                <View className={cn('mt-1 h-1 w-full rounded', HABIT_DOT[h.color])} />
              </View>
            ))}
          </View>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-12 pt-1">
        {rows.map((row) => (
          <DayRow
            key={row.dayAgo}
            row={row}
            currentYear={currentYear}
            shape={shape}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function formatDayLabel(date: Date, dayAgo: number, currentYear: number): string {
  if (dayAgo === 0) return 'Today';
  if (dayAgo === 1) return 'Yesterday';
  if (date.getFullYear() === currentYear) return format(date, 'EEE, MMM d');
  return format(date, 'MMM d, yyyy');
}

function DayRow({
  row,
  currentYear,
  shape,
}: {
  row: { dayAgo: number; date: Date; perHabit: number[] };
  currentYear: number;
  shape: CellShape;
}) {
  const label = formatDayLabel(row.date, row.dayAgo, currentYear);
  const cellClass =
    shape === 'square' ? 'flex-1 aspect-square rounded' : 'h-6 flex-1 rounded';

  return (
    <View className="flex-row items-center gap-3 border-b border-border/40 py-2">
      <Text variant="muted" className="w-24 text-xs">
        {label}
      </Text>
      <View className="flex-1 flex-row gap-1.5">
        {MOCK_HABITS.map((h, i) => {
          const count = row.perHabit[i];
          const done = count > 0;
          return (
            <View
              key={h.id}
              className={cn(cellClass, done ? HABIT_DOT[h.color] : 'bg-muted')}
            />
          );
        })}
      </View>
    </View>
  );
}
