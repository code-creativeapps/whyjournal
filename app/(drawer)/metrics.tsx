import { router } from 'expo-router';
import { AwardIcon, CalendarDaysIcon, FlameIcon, ListChecksIcon, LogOutIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/stores/auth';
import { useEntriesStore } from '@/lib/stores/entries';
import { useOnboardingStore } from '@/lib/stores/onboarding';
import { bestStreak, currentStreak, totalDaysLogged } from '@/lib/streak';

export default function MetricsScreen() {
  const entries = useEntriesStore((state) => state.entries);
  const email = useAuthStore((state) => state.session?.user?.email);

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

      {email ? (
        <Text variant="muted" className="mt-8 text-center text-xs">
          Signed in as {email}
        </Text>
      ) : null}

      <Pressable
        onPress={async () => {
          useOnboardingStore.getState().reset();
          router.replace('/onboarding');
        }}
        className="mt-2 items-center rounded-xl border border-border bg-background px-4 py-3">
        <Text variant="small" className="text-muted-foreground">
          Replay onboarding
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          Alert.alert('Sign out?', 'Your data stays in the cloud — sign back in any time.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign out',
              style: 'destructive',
              onPress: async () => {
                await useAuthStore.getState().signOut();
              },
            },
          ]);
        }}
        className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-3">
        <Icon as={LogOutIcon} size={16} className="text-destructive" />
        <Text variant="small" className="font-medium text-destructive">
          Sign out
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
