import { CheckIcon, HeartIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// A small illustrative mock of the journal feed used on the welcome step of
// onboarding and on the empty-state journal home, so the user sees what their
// journal will look like before they've added anything.
export function JournalPreview({ muted = false }: { muted?: boolean }) {
  return (
    <View
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-background',
        muted && 'opacity-80'
      )}>
      <View className="border-b border-border px-4 py-2">
        <Text variant="small" className="text-muted-foreground">
          Today
        </Text>
      </View>
      <PreviewRow
        icon={CheckIcon}
        iconBg="bg-green-500/15"
        iconColor="text-green-600"
        title="Ran 5 km"
        body="Beat last week’s time"
      />
      <View className="h-px bg-border" />
      <PreviewRow
        icon={CheckIcon}
        iconBg="bg-green-500/15"
        iconColor="text-green-600"
        title="Shipped the v1 draft"
      />
      <View className="h-px bg-border" />
      <PreviewRow
        icon={HeartIcon}
        iconBg="bg-pink-500/15"
        iconColor="text-pink-600"
        title="Coffee with mom"
      />
    </View>
  );
}

function PreviewRow({
  icon,
  iconBg,
  iconColor,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  iconBg: string;
  iconColor: string;
  title: string;
  body?: string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-2.5">
      <View className={cn('size-7 items-center justify-center rounded-full', iconBg)}>
        <Icon as={icon} size={17} className={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-base" numberOfLines={1}>
          {title}
        </Text>
        {body ? (
          <Text variant="muted" numberOfLines={1} className="text-xs">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
