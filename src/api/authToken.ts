import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Standalone auth-token holder. Kept independent of the Zustand stores and the
 * API client so there are no import cycles (client -> token, store -> token).
 *
 * NOTE: for production, prefer `expo-secure-store` over AsyncStorage to store
 * the token in the device keychain (SecureStore has no web support, hence the
 * AsyncStorage default here).
 */
const STORAGE_KEY = 'stopix-token';

let currentToken: string | null = null;

export function getToken(): string | null {
  return currentToken;
}

export async function setToken(token: string): Promise<void> {
  currentToken = token;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, token);
  } catch {
    // non-fatal: token stays in memory for this session
  }
}

export async function clearToken(): Promise<void> {
  currentToken = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Load the persisted token into memory. Call once at app startup. */
export async function initAuthToken(): Promise<string | null> {
  try {
    currentToken = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    currentToken = null;
  }
  return currentToken;
}
