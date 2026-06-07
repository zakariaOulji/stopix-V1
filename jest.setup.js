/* eslint-disable @typescript-eslint/no-require-imports */
// Mock AsyncStorage (used by zustand persist) for the test environment.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
