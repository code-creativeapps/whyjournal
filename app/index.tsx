import { Link, Stack } from 'expo-router';
import { FlameIcon, PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, SectionList, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/entry-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { onCelebrate } from '@/lib/celebrate';
import { groupEntries } from '@/lib/grouping';
import { useEntriesStore } from '@/lib/stores/entries';
import { currentStreak } from '@/lib/streak';

const SCREEN_WIDTH = Dimensions.get('window').width;

const FAB_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 8,
};

export default function HomeScreen() {
  const entries = useEntriesStore((state) => state.entries);
  const hydrated = useEntriesStore((state) => state.hydrated);
  const cannon = React.useRef<ConfettiCannon>(null);
  const insets = useSafeAreaInsets();

  const sections = React.useMemo(() => groupEntries(entries), [entries]);
  const streak = React.useMemo(() => currentStreak(entries), [entries]);

  React.useEffect(() => onCelebrate(() => cannon.current?.start()), []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Journal',
          headerRight: () =>
            streak > 0 ? (
              <View className="mr-2 flex-row items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1">
                <Icon as={FlameIcon} size={14} className="text-orange-500" />
                <Text className="text-sm font-semibold text-orange-600">
                  {streak}-day streak
                </Text>
              </View>
            ) : null,
        }}
      />
      {hydrated && entries.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EntryRow entry={item} />}
          renderSectionHeader={({ section }) => (
            <View className="bg-background px-4 pb-1 pt-3">
              <Text variant="small" className="text-muted-foreground">
                {section.title}
              </Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        />
      )}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + 16,
          alignItems: 'center',
        }}>
        <Link href="/new" asChild>
          <Button size="icon" className="size-14 rounded-full" style={FAB_SHADOW}>
            <Icon as={PlusIcon} className="size-6" />
          </Button>
        </Link>
      </View>
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
    </>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <Text variant="h3" className="text-center">
        Start with one win today
      </Text>
      <Text variant="muted" className="text-center">
        Capture a small win or something you&apos;re grateful for. It takes less than a minute.
      </Text>
    </View>
  );
}
