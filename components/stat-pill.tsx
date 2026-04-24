import { AwardIcon, CalendarDaysIcon, FlameIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useEntriesStore } from '@/lib/stores/entries';
import { bestStreak, currentStreak, totalDaysLogged } from '@/lib/streak';

type Mode = 'streak' | 'total';

export function StatPill() {
  const entries = useEntriesStore((state) => state.entries);
  const [mode, setMode] = React.useState<Mode>('streak');

  const current = React.useMemo(() => currentStreak(entries), [entries]);
  const best = React.useMemo(() => bestStreak(entries), [entries]);
  const total = React.useMemo(() => totalDaysLogged(entries), [entries]);

  if (total === 0) return null;

  const showingStreak = mode === 'streak';
  const hasCurrent = current > 0;
  const streakNumber = hasCurrent ? current : best;
  const streakIcon = hasCurrent ? FlameIcon : AwardIcon;
  const streakColor = hasCurrent ? 'text-orange-500' : 'text-amber-500';
  const streakBg = hasCurrent ? 'bg-orange-500/15' : 'bg-amber-500/15';
  const streakText = hasCurrent ? 'text-orange-600' : 'text-amber-600';

  return (
    <Pressable
      onPress={() => setMode(showingStreak ? 'total' : 'streak')}
      hitSlop={8}
      className="mr-3">
      {showingStreak ? (
        <View className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${streakBg}`}>
          <Text className={`text-sm font-semibold ${streakText}`}>{streakNumber}</Text>
          <Icon as={streakIcon} size={14} className={streakColor} />
        </View>
      ) : (
        <View className="flex-row items-center gap-1 rounded-full bg-sky-500/15 px-3 py-1">
          <Text className="text-sm font-semibold text-sky-600">{total}</Text>
          <Icon as={CalendarDaysIcon} size={14} className="text-sky-500" />
        </View>
      )}
    </Pressable>
  );
}
