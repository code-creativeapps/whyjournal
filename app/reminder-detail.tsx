import { Stack, router, useLocalSearchParams } from 'expo-router';
import { PencilIcon, QuoteIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAffirmationsStore } from '@/lib/stores/affirmations';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const items = useAffirmationsStore((state) => state.items);

  // Snapshot the deck at mount so the page-index stays stable while the user
  // swipes — re-ordering the underlying store mid-swipe would jump positions.
  const cardsRef = React.useRef(items);
  const cards = cardsRef.current;

  const initialIndex = React.useMemo(() => {
    const idx = id ? cards.findIndex((a) => a.id === id) : -1;
    return idx >= 0 ? idx : 0;
  }, [cards, id]);

  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const current = cards[currentIndex];

  React.useEffect(() => {
    if (cards.length === 0 && router.canGoBack()) router.back();
  }, [cards]);

  if (cards.length === 0 || !current) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reminder',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/simple-item',
                  params: { kind: 'affirmation', id: current.id },
                })
              }
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (idx !== currentIndex) setCurrentIndex(idx);
          }}>
          {cards.map((item) => (
            <View key={item.id} style={{ width: SCREEN_WIDTH }} className="flex-1">
              <ScrollView contentContainerClassName="gap-6 px-6 pt-12 pb-10">
                <View className="items-center gap-4">
                  <View className="size-20 items-center justify-center rounded-full bg-sky-500/15">
                    <Icon as={QuoteIcon} size={40} className="text-sky-500" />
                  </View>
                  <Text variant="h2" className="text-center">
                    {item.title}
                  </Text>
                </View>

                {item.body ? (
                  <Text className="text-center text-base leading-7 text-foreground">
                    {item.body}
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
        {cards.length > 1 ? (
          <View
            pointerEvents="none"
            className="absolute bottom-6 left-0 right-0 flex-row items-center justify-center gap-1.5">
            {cards.map((_, idx) => (
              <View
                key={idx}
                className={
                  idx === currentIndex
                    ? 'size-1.5 rounded-full bg-foreground'
                    : 'size-1.5 rounded-full bg-muted-foreground/30'
                }
              />
            ))}
          </View>
        ) : null}
      </View>
    </>
  );
}
