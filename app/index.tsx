import { Link, Stack } from 'expo-router';
import { PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { SectionList, View } from 'react-native';

import { EntryRow } from '@/components/entry-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { groupEntries } from '@/lib/grouping';
import { useEntriesStore } from '@/lib/stores/entries';

export default function HomeScreen() {
  const entries = useEntriesStore((state) => state.entries);
  const hydrated = useEntriesStore((state) => state.hydrated);

  const sections = React.useMemo(() => groupEntries(entries), [entries]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Journal',
          headerRight: () => (
            <Link href="/new" asChild>
              <Button size="icon" variant="ghost" className="rounded-full">
                <Icon as={PlusIcon} className="size-5" />
              </Button>
            </Link>
          ),
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
            <View className="bg-background px-4 pb-1 pt-4">
              <Text variant="small" className="text-muted-foreground">
                {section.title}
              </Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View className="ml-14 h-px bg-border" />}
          contentContainerClassName="pb-8"
        />
      )}
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
      <Link href="/new" asChild>
        <Button>
          <Icon as={PlusIcon} />
          <Text>Add an entry</Text>
        </Button>
      </Link>
    </View>
  );
}
