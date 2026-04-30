import type { LucideIcon } from 'lucide-react-native';
import { CheckIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type CommonProps = {
  title: string;
  body?: string;
  subtitle?: string;
  subtitleLeading?: React.ReactNode;
  onPress?: () => void;
};

type WithCheckProps = CommonProps & {
  kind: 'checkbox';
  done: boolean;
  onToggle: () => void;
};

type WithIconProps = CommonProps & {
  kind: 'icon';
  icon: LucideIcon;
  iconBgClass?: string;
  iconColorClass?: string;
  done?: boolean;
};

export type SimpleItemRowProps = WithCheckProps | WithIconProps;

export function SimpleItemRow(props: SimpleItemRowProps) {
  const { title, body, subtitle, subtitleLeading, onPress } = props;
  const isDone =
    (props.kind === 'checkbox' && props.done) ||
    (props.kind === 'icon' && props.done === true);
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable onPress={onPress} className="active:bg-accent">
        <View className="flex-row items-center gap-3 px-4 py-2">
          {props.kind === 'checkbox' ? (
            <Pressable
              onPress={props.onToggle}
              hitSlop={8}
              className={cn(
                'size-6 items-center justify-center rounded-md border-2',
                props.done ? 'border-green-500 bg-green-500' : 'border-muted-foreground/40'
              )}>
              {props.done ? <Icon as={CheckIcon} size={14} className="text-white" /> : null}
            </Pressable>
          ) : (
            <View
              className={cn(
                'size-6 items-center justify-center rounded-full',
                props.iconBgClass ?? 'bg-muted'
              )}>
              <Icon
                as={props.icon}
                size={14}
                className={props.iconColorClass ?? 'text-foreground'}
              />
            </View>
          )}
          <View className="flex-1">
            <Text
              className={cn(
                'text-base',
                isDone && 'text-muted-foreground line-through'
              )}
              numberOfLines={1}>
              {title}
            </Text>
            {subtitle || subtitleLeading ? (
              <View className="flex-row items-center gap-1">
                {subtitleLeading}
                {subtitle ? (
                  <Text variant="muted" className="text-xs">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {body ? (
              <Text variant="muted" numberOfLines={1}>
                {body}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

