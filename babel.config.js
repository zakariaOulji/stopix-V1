module.exports = function (api) {
  api.cache(true);
  return {
    // unstable_transformImportMeta: zustand's ESM build (zustand/middleware.mjs,
    // resolved on web) uses `import.meta.env`, which crashes the classic-script
    // web bundle ("Cannot use 'import.meta' outside a module").
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    // react-native-worklets/plugin must be listed LAST.
    // (Reanimated 4 ships its Babel plugin via react-native-worklets.)
    plugins: ['react-native-worklets/plugin'],
  };
};
