import * as React from 'react';
import { Dimensions, SectionList, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/entry-row';
import { Fab } from '@/components/fab';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { onCelebrate } from '@/lib/celebrate';
import { groupEntries } from '@/lib/grouping';
import { useEntriesStore } from '@/lib/stores/entries';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function JournalScreen() {
  const entries = useEntriesStore((state) => state.entries);
  const hydrated = useEntriesStore((state) => state.hydrated);
  const cannon = React.useRef<ConfettiCannon>(null);
  const insets = useSafeAreaInsets();

  const sections = React.useMemo(() => groupEntries(entries), [entries]);

  React.useEffect(() => onCelebrate(() => cannon.current?.start()), []);

  return (
    <SwipeableScreen route="index">
      <View className="flex-1">
      {hydrated && entries.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text variant="h3" className="text-center">
            Start with one win today
          </Text>
          <Text variant="muted" className="text-center">
            Capture a small win or something you&apos;re grateful for. It takes less than a minute.
          </Text>
        </View>
      ) : (
        <>
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
