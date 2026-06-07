/**
 * App configuration, driven by Expo public env vars (inlined at build time).
 *
 * Set these in a `.env` file (see `.env.example`):
 *   EXPO_PUBLIC_API_URL=https://api.stopix.app
 *   EXPO_PUBLIC_USE_MOCKS=false
 *
 * While USE_MOCKS is true the whole app runs on local mock data (no network).
 * Flip it to false (and set API_URL) to hit the real backend — no other change
 * is required in screens or stores.
 */
export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.stopix.app',
  /** Defaults to mocks unless explicitly disabled. */
  USE_MOCKS: (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true').toLowerCase() !== 'false',
  /** Network timeout (ms) for API requests. */
  REQUEST_TIMEOUT: Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT ?? 15000),
} as const;
