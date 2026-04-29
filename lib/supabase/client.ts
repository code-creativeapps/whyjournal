import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in the values, then restart Metro with `npx expo start -c`.'
  );
}

// On native, persist auth via AsyncStorage. On web we leave `storage`
// unset so Supabase uses its default (localStorage at runtime, no-op
// during Expo's static/SSR render where `window` is undefined).
const isWeb = Platform.OS === 'web';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
