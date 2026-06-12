import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolved by app.config.ts at build time. EAS builds inject the values via
// `eas env`; local dev reads them from .env.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};
const url = extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase URL or anon key. Copy .env.example to .env and fill in the values (or set them in EAS env), then restart Metro with `npx expo start -c`.'
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
