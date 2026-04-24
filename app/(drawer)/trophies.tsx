import { router } from 'expo-router';
import { TrophyIcon } from 'lucide-react-native';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { useTrophiesStore } from '@/lib/stores/trophies';

export default function TrophiesScreen() {
  const items = useTrophiesStore((state) => state.items);
  const hydrated = useTrophiesStore((state) => state.hydrated);
  const insets = useSafeAreaInsets();

  return (
    <SwipeableScreen route="trophies">
      <View className="flex-1">
      {hydrated && items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text variant="h3" className="text-center">
            Trophies
          </Text>
          <Text variant="muted" className="text-center">
            Celebrate big wins from your past. A highlight reel you can revisit on hard days.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SimpleItemRow
              kind="icon"
              icon={TrophyIcon}
              iconBgClass="bg-amber-500/15"
              iconColorClass="text-amber-500"
              title={item.title}
              body={item.body}
              subtitle={item.when}
              onPress={() =>
                router.push({ pathname: '/simple-item', params: { kind: 'trophy', id: item.id } })
              }
            />
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        />
      )}
      <Fab href={{ pathname: '/simple-item', params: { kind: 'trophy' } }} />
      </View>
    </SwipeableScreen>
  );
}
