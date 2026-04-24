import { router } from 'expo-router';
import { AwardIcon, CalendarDaysIcon, FlameIcon, ListChecksIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useEntriesStore } from '@/lib/stores/entries';
import { useOnboardingStore } from '@/lib/stores/onboarding';
import { bestStreak, currentStreak, totalDaysLogged } from '@/lib/streak';

export default function MetricsScreen() {
  const entries = useEntriesStore((state) => state.entries);

  const current = React.useMemo(() => currentStreak(entries), [entries]);
  const best = React.useMemo(() => bestStreak(entries), [entries]);
  const totalDays = React.useMemo(() => totalDaysLogged(entries), [entries]);
  const totalEntries = entries.length;

  return (
    <ScrollView contentContainerClassName="gap-3 px-4 pt-4 pb-10">
      <StatCard
        icon={FlameIcon}
        iconClass="text-orange-500"
        bgClass="bg-orange-500/10"
        label="Current streak"
        value={`${current} ${current === 1 ? 'day' : 'days'}`}
      />
      <StatCard
        icon={AwardIcon}
        iconClass="text-amber-500"
        bgClass="bg-amber-500/10"
        label="Best streak"
        value={`${best} ${best === 1 ? 'day' : 'days'}`}
      />
      <StatCard
        icon={CalendarDaysIcon}
        iconClass="text-sky-500"
        bgClass="bg-sky-500/10"
        label="Total days logged"
        value={`${totalDays}`}
      />
      <StatCard
        icon={ListChecksIcon}
        iconClass="text-green-500"
        bgClass="bg-green-500/10"
        label="Total entries"
        value={`${totalEntries}`}
      />

      <Pressable
        onPress={async () => {
          await useOnboardingStore.getState().reset();
          router.replace('/onboarding');
        }}
        className="mt-6 items-center rounded-xl border border-border bg-background px-4 py-3">
        <Text variant="small" className="text-muted-foreground">
          Replay onboarding
        </Text>
      </Pressable>
    </ScrollView>
  );
}

type StatCardProps = {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  label: string;
  value: string;
};

function StatCard({ icon, iconClass, bgClass, label, value }: StatCardProps) {
  return (
    <View className={`flex-row items-center gap-4 rounded-2xl border border-border p-4 ${bgClass}`}>
      <View className="size-12 items-center justify-center rounded-full bg-background">
        <Icon as={icon} size={24} className={iconClass} />
      </View>
      <View className="flex-1">
        <Text variant="muted" className="text-xs uppercase tracking-wide">
          {label}
        </Text>
        <Text className="text-2xl font-bold">{value}</Text>
      </View>
    </View>
  );
}
