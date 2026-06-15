const { withAndroidManifest } = require('@expo/config-plugins');

// expo-audio's plugin auto-adds FOREGROUND_SERVICE_MEDIA_PLAYBACK to the
// merged Android manifest, but LogHero only uses expo-audio for one-shot
// celebration SFX — no foreground service is started. Google Play requires
// a video justification for every FG service permission, so we strip it
// here.
//
// Gradle's manifest merger re-injects permissions declared by AAR
// dependencies, so just deleting the <uses-permission> entry isn't enough.
// We add a `tools:node="remove"` directive instead — that tells the merger
// to remove the permission no matter where it appears in dependent
// manifests.
const PERM = 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK';

module.exports = function withRemoveFgMediaPlayback(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (p) => p?.$?.['android:name'] !== PERM
    );
    manifest['uses-permission'].push({
      $: {
        'android:name': PERM,
        'tools:node': 'remove',
      },
    });
    return cfg;
  });
};
