import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { TargetIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  GOAL_EMOJIS,
  LUCIDE_ICON_MAP,
  LUCIDE_ICON_NAMES,
} from '@/lib/goals/icon';
import { cn } from '@/lib/utils';

function renderBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
    />
  );
}

export const GoalIconPickerSheet = React.forwardRef<
  BottomSheetModal,
  {
    selected?: string;
    onPick: (icon: string | undefined) => void;
  }
>(function GoalIconPickerSheet({ selected, onPick }, ref) {
  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={false}
      snapPoints={['70%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: 'hsl(0 0% 100%)' }}
      handleIndicatorStyle={{ backgroundColor: 'rgba(120,120,120,0.4)' }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-3 pt-1">
          <Text className="text-lg font-semibold">Goal icon</Text>
          <Text variant="muted" className="text-sm">
            Pick an emoji or icon to represent this goal.
          </Text>
        </View>

        <Section label="Default">
          <Pressable
            onPress={() => onPick(undefined)}
            className={cn(
              'size-12 items-center justify-center rounded-full',
              !selected ? 'bg-red-500/15' : 'bg-muted'
            )}>
            <Icon as={TargetIcon} size={22} className="text-red-500" />
          </Pressable>
        </Section>

        <Section label="Emojis">
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}>
            {GOAL_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => onPick(emoji)}
                className={cn(
                  'size-12 items-center justify-center rounded-full',
                  selected === emoji ? 'bg-primary/15' : 'bg-muted'
                )}>
                <Text style={{ fontSize: 24, lineHeight: 28 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section label="Icons">
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}>
            {LUCIDE_ICON_NAMES.map((name) => {
              const Lucide = LUCIDE_ICON_MAP[name];
              const isSelected = selected === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => onPick(name)}
                  className={cn(
                    'size-12 items-center justify-center rounded-full',
                    isSelected ? 'bg-primary/15' : 'bg-muted'
                  )}>
                  <Icon
                    as={Lucide}
                    size={22}
                    className={isSelected ? 'text-primary' : 'text-foreground'}
                  />
                </Pressable>
              );
            })}
          </View>
        </Section>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="px-5 pb-4 pt-3">
      <Text variant="muted" className="pb-2 text-xs uppercase tracking-wide">
        {label}
      </Text>
      {children}
    </View>
  );
}
