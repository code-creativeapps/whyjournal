import type { ExpoConfig } from 'expo/config';

// Resolved at build time. In dev, values come from a local .env file (loaded
// by Expo automatically); in EAS builds, set them via `eas env:create`.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const config: ExpoConfig = {
  name: 'LogHero',
  slug: 'loghero',
  owner: 'creativeapps.dev',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'loghero',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#8b5cf6',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.loghero.app',
    buildNumber: '1',
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'LogHero needs access to your photos so you can attach images to your goals.',
      // We use only HTTPS via standard system frameworks — no proprietary crypto.
      ITSAppUsesNonExemptEncryption: false,
    },
    usesAppleSignIn: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#8b5cf6',
    },
    package: 'com.loghero.app',
    versionCode: 3,
    permissions: ['READ_MEDIA_IMAGES', 'READ_EXTERNAL_STORAGE'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-audio',
    'expo-web-browser',
    'expo-apple-authentication',
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '15.1' },
      },
    ],
    './plugins/with-remove-fg-media-playback',
  ],
  experiments: {
    typedRoutes: true,
  },
  updates: {
    url: 'https://u.expo.dev/4e170071-aa13-43dc-b28b-9a182d259f96',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    supabaseUrl,
    supabaseAnonKey,
    eas: {
      projectId: '4e170071-aa13-43dc-b28b-9a182d259f96',
    },
  },
};

export default config;
