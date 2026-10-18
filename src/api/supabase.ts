import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env';

/**
 * Supabase client. Session is persisted via AsyncStorage and auto-refreshed.
 * In mock mode the URL/key may be empty — a placeholder keeps `createClient`
 * from throwing at import time; the client is only actually used when
 * USE_MOCKS=false (and real credentials are set).
 */
// Guard against a missing/malformed URL so a bad .env can't crash the app at
// import time (createClient throws on an invalid URL otherwise).
const validUrl = /^https?:\/\/.+/.test(ENV.SUPABASE_URL.trim());
if (!ENV.USE_MOCKS && !validUrl) {
  console.warn(
    '[STOPIX] EXPO_PUBLIC_SUPABASE_URL is missing or invalid (must start with https://). Falling back to a placeholder — Supabase calls will fail until fixed.',
  );
}

const resolvedUrl = validUrl ? ENV.SUPABASE_URL.trim() : 'https://placeholder.supabase.co';
if (!ENV.USE_MOCKS) {
  // Diagnostic — confirms which URL the app actually loaded from .env.
  console.log(
    `[STOPIX] Supabase URL = ${resolvedUrl} | anon key length = ${ENV.SUPABASE_ANON_KEY.trim().length}`,
  );
}

/**
 * Web: whether the page was opened from a password-reset email. Read at import
 * time, before supabase-js consumes the token and cleans the URL.
 */
export const OPENED_FROM_RECOVERY_LINK =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  /(?:^|[#&?])type=recovery(?:&|$)/.test(`${window.location.hash}&${window.location.search}`);

export const supabase = createClient(
  resolvedUrl,
  ENV.SUPABASE_ANON_KEY.trim() || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Web: pick up the session from email confirmation / magic links
      // (#access_token in the URL). Native has no URL to read.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);
