import 'react-native-url-polyfill/auto';
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

export const supabase = createClient(
  resolvedUrl,
  ENV.SUPABASE_ANON_KEY.trim() || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
