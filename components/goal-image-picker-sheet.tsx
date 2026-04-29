import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageIcon, Loader2Icon, SearchIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Dimensions, Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { pexelsAttribution, searchPexels, type PexelsPhoto } from '@/lib/goal-images/pexels';
import type { GoalImageSource } from '@/lib/goal-images/types';
import { uploadGoalImage } from '@/lib/goal-images/upload';
import { useAuthStore } from '@/lib/stores/auth';

export type PickedImage = {
  url: string;
  source: GoalImageSource;
  attribution?: string;
};

export type GoalImagePickerSheetRef = BottomSheetModal;

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

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_COLS = 3;
const GRID_GAP = 6;

export const GoalImagePickerSheet = React.forwardRef<
  BottomSheetModal,
  {
    goalId: string;
    onPick: (img: PickedImage) => void;
  }
>(function GoalImagePickerSheet({ goalId, onPick }, ref) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [query, setQuery] = React.useState('');
  const [photos, setPhotos] = React.useState<PexelsPhoto[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  // Debounce the Pexels search by 300ms.
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPhotos([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const handle = setTimeout(() => {
      searchPexels(trimmed)
        .then(setPhotos)
        .catch((e) => {
          setPhotos([]);
          setSearchError(e instanceof Error ? e.message : 'Search failed');
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleLibraryPick() {
    if (!userId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (picked.canceled || picked.assets.length === 0) return;
    const asset = picked.assets[0];
    setUploading(true);
    try {
      const { url } = await uploadGoalImage({
        goalId,
        userId,
        localUri: asset.uri,
      });
      onPick({ url, source: 'upload' });
    } finally {
      setUploading(false);
    }
  }

  function handlePexelsPick(photo: PexelsPhoto) {
    onPick({
      url: photo.src.large,
      source: 'pexels',
      attribution: pexelsAttribution(photo),
    });
  }

  const tileSize = (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={false}
      snapPoints={['85%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: 'hsl(0 0% 100%)' }}
      handleIndicatorStyle={{ backgroundColor: 'rgba(120,120,120,0.4)' }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-4 pt-1">
          <Text className="text-lg font-semibold">Add image</Text>
          <Text variant="muted" className="text-sm">
            Choose from your library, or search Pexels.
          </Text>
        </View>

        <Pressable
          onPress={handleLibraryPick}
          disabled={uploading}
          className="flex-row items-center gap-3 px-5 py-3 active:bg-accent">
          <View className="size-9 items-center justify-center rounded-full bg-primary">
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Icon as={ImageIcon} size={18} className="text-primary-foreground" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium">
              {uploading ? 'Uploading…' : 'Choose from library'}
            </Text>
            <Text variant="muted" className="text-xs">
              Pick a photo from your phone.
            </Text>
          </View>
        </Pressable>

        <View className="mt-2 h-px bg-border" />

        <View className="px-5 pt-3 pb-2">
          <Text variant="muted" className="text-xs uppercase tracking-wide">
            Search Pexels
          </Text>
        </View>
        <View className="px-4 pb-3">
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="e.g. mountain trail, focused work"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            {searching ? <Icon as={Loader2Icon} size={16} className="text-muted-foreground" /> : null}
          </View>
        </View>

        {searchError ? (
          <View className="px-5 pb-3">
            <Text variant="muted" className="text-xs">
              {searchError}
            </Text>
          </View>
        ) : null}

        {photos.length === 0 && !searching && query.trim().length > 0 && !searchError ? (
          <View className="px-5 pb-6">
            <Text variant="muted" className="text-sm">
              No matches.
            </Text>
          </View>
        ) : null}

        {photos.length > 0 ? (
          <View
            className="px-4"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: GRID_GAP,
            }}>
            {photos.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => handlePexelsPick(p)}
                style={{ width: tileSize, height: tileSize }}
                className="overflow-hidden rounded-lg active:opacity-70">
                <Image
                  source={{ uri: p.src.medium }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={120}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {photos.length === 0 && !searching && query.trim().length === 0 ? (
          <View className="px-5 pb-6">
            <View className="flex-row items-center gap-2">
              <Icon as={SearchIcon} size={14} className="text-muted-foreground" />
              <Text variant="muted" className="text-xs">
                Type a keyword to search.
              </Text>
            </View>
          </View>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
