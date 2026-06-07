const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Adds <queries> entries so the app can detect installed navigation apps via
 * Linking.canOpenURL on Android 11+ (package visibility restrictions).
 * Only affects native builds (prebuild / dev build) — not Expo Go.
 */
const SCHEMES = ['geo', 'comgooglemaps', 'waze', 'google.navigation'];

module.exports = function withNavQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [];
    manifest.queries.push({
      intent: SCHEMES.map((scheme) => ({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': scheme } }],
      })),
    });
    return cfg;
  });
};
