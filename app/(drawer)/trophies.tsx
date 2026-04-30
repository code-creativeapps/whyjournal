import { router } from 'expo-router';
import { TrophyIcon } from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FabRow } from '@/components/fab-row';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { onCelebrateTrophy } from '@/lib/celebrate';
import { useTrophiesStore } from '@/lib/stores/trophies';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TrophiesScreen() {
  const items = useTrophiesStore((state) => state.items);
  const hydrated = useTrophiesStore((state) => state.hydrated);
  const deleteItem = useTrophiesStore((state) => state.deleteItem);
  const insets = useSafeAreaInsets();
  const cannon = React.useRef<ConfettiCannon>(null);

  React.useEffect(() => onCelebrateTrophy(() => cannon.current?.start()), []);

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
              <SwipeableRow
                onEdit={() =>
                  router.push({
                    pathname: '/simple-item',
                    params: { kind: 'trophy', id: item.id },
                  })
                }
                onDelete={() => deleteItem(item.id)}
                deleteConfirmTitle="Delete trophy"
              >
                <SimpleItemRow
                  kind="icon"
                  icon={TrophyIcon}
                  iconBgClass="bg-amber-500/15"
                  iconColorClass="text-amber-500"
                  title={item.title}
                  body={item.body}
                  subtitle={item.when}
                  onPress={() =>
                    router.push({ pathname: '/trophy-detail', params: { id: item.id } })
                  }
                />
              </SwipeableRow>
            )}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        )}
        <FabRow href={{ pathname: '/simple-item', params: { kind: 'trophy' } }} />
        <View pointerEvents="none" className="absolute inset-0">
          <ConfettiCannon
            ref={cannon}
            count={140}
            origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT + 20 }}
            autoStart={false}
            fadeOut
            explosionSpeed={500}
            fallSpeed={3500}
          />
        </View>
      </View>
    </SwipeableScreen>
  );
}
