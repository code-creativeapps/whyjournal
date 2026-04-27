import { PencilIcon, Trash2Icon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components/ui/icon';

const ACTION_WIDTH = 72;

type Props = {
  onEdit?: () => void;
  onDelete: () => void;
  /** Custom delete-confirm copy. Defaults to a generic message. */
  deleteConfirmTitle?: string;
  deleteConfirmBody?: string;
  children: React.ReactNode;
};

export function SwipeableRow({
  onEdit,
  onDelete,
  deleteConfirmTitle = 'Delete?',
  deleteConfirmBody = 'This cannot be undone.',
  children,
}: Props) {
  const ref = React.useRef<SwipeableMethods>(null);

  function handleEdit() {
    ref.current?.close();
    onEdit?.();
  }

  function handleDelete() {
    Alert.alert(deleteConfirmTitle, deleteConfirmBody, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => ref.current?.close(),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          ref.current?.close();
          onDelete();
        },
      },
    ]);
  }

  function renderRightActions() {
    return (
      <View className="flex-row">
        {onEdit ? (
          <Pressable
            onPress={handleEdit}
            className="items-center justify-center bg-primary"
            style={{ width: ACTION_WIDTH }}>
            <Icon as={PencilIcon} size={20} className="text-primary-foreground" />
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleDelete}
          className="items-center justify-center bg-destructive"
          style={{ width: ACTION_WIDTH }}>
          <Icon as={Trash2Icon} size={20} className="text-white" />
        </Pressable>
      </View>
    );
  }

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      renderRightActions={renderRightActions}
      overshootRight={false}>
      {children}
    </ReanimatedSwipeable>
  );
}
