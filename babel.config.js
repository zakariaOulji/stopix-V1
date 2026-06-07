module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin must be listed LAST.
    // (Reanimated 4 ships its Babel plugin via react-native-worklets.)
    plugins: ['react-native-worklets/plugin'],
  };
};
