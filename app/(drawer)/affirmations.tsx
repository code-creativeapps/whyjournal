import { router } from 'expo-router';
import { QuoteIcon } from 'lucide-react-native';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { useAffirmationsStore } from '@/lib/stores/affirmations';

export default function AffirmationsScreen() {
  const items = useAffirmationsStore((state) => state.items);
  const hydrated = useAffirmationsStore((state) => state.hydrated);
  const insets = useSafeAreaInsets();

  return (
    <SwipeableScreen route="affirmations">
      <View className="flex-1">
      {hydrated && items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text variant="h3" className="text-center">
            Collect affirmations
          </Text>
          <Text variant="muted" className="text-center">
            Save positive thoughts, reminders, and self-truths you want to come back to.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SimpleItemRow
              kind="icon"
              icon={QuoteIcon}
              iconBgClass="bg-indigo-500/15"
              iconColorClass="text-indigo-500"
              title={item.title}
              body={item.body}
              onPress={() =>
                router.push({ pathname: '/simple-item', params: { kind: 'affirmation', id: item.id } })
              }
            />
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        />
      )}
      <Fab href={{ pathname: '/simple-item', params: { kind: 'affirmation' } }} />
      </View>
    </SwipeableScreen>
  );
}
