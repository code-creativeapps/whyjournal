const { withAndroidManifest } = require('@expo/config-plugins');

// expo-audio's plugin auto-adds FOREGROUND_SERVICE_MEDIA_PLAYBACK to the
// merged Android manifest, but LogHero only uses expo-audio for one-shot
// celebration SFX — no foreground service is started. Google Play requires
// a video justification for every FG service permission, so we strip it
// here. If we later add real background media playback, drop this plugin.
const PERM = 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK';

module.exports = function withRemoveFgMediaPlayback(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (p) => p?.$?.['android:name'] !== PERM
      );
    }
    return cfg;
  });
};
