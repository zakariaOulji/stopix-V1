// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    rules: {
      // The experimental react-compiler rules (eslint-plugin-react-hooks v6)
      // produce false positives on Reanimated shared values (`sv.value = …`)
      // and Animated.Value patterns (`useRef(new Animated.Value()).current`).
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'node_modules/*',
      'babel.config.js',
      'jest.config.js',
      'jest.setup.js',
      'plugins/*',
    ],
  },
];
