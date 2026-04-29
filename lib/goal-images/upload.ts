import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase/client';

const BUCKET = 'goal-images';
const MAX_DIMENSION = 1600;
const QUALITY = 0.85;

function randomKey() {
  // Cheap unique segment — Date.now + 6 random hex chars. The full storage
  // path is namespaced under user_id/goal_id, so collisions are scoped to
  // a single goal in a single ms.
  const rand = Math.random().toString(16).slice(2, 8);
  return `${Date.now()}-${rand}`;
}

/**
 * Resize+compress an image at `localUri`, upload it to Supabase Storage under
 * `{userId}/{goalId}/{key}.jpg`, and return the public URL.
 */
export async function uploadGoalImage(opts: {
  goalId: string;
  userId: string;
  localUri: string;
}): Promise<{ url: string }> {
  const compressed = await manipulateAsync(
    opts.localUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: QUALITY, format: SaveFormat.JPEG }
  );

  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();

  const path = `${opts.userId}/${opts.goalId}/${randomKey()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
