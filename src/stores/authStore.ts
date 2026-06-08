import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import { authService, type RegisterPayload } from '@/services';
import { setToken, clearToken } from '@/api';
import { ENV } from '@/config/env';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  /** True once persisted state has been read back from storage. */
  _hasHydrated: boolean;
  /** Mocked login — ignores credentials, loads the demo driver after a delay. */
  login: (email?: string, password?: string) => Promise<void>;
  /** Mocked registration — merges payload onto the demo driver. */
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setHydrated: () => void;
  /** Restore an existing Supabase session on app start (no-op in mock mode). */
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isSubmitting: false,
      _hasHydrated: false,

      login: async (email = '', password = '') => {
        set({ isSubmitting: true });
        try {
          const { user, token } = await authService.login(email, password);
          await setToken(token);
          set({ user, isAuthenticated: true, isSubmitting: false });
        } catch (err) {
          set({ isSubmitting: false });
          throw err;
        }
      },

      register: async (payload) => {
        set({ isSubmitting: true });
        try {
          const { user, token } = await authService.register(payload);
          await setToken(token);
          set({ user, isAuthenticated: true, isSubmitting: false });
        } catch (err) {
          set({ isSubmitting: false });
          throw err;
        }
      },

      logout: () => {
        void authService.logout();
        void clearToken();
        set({ user: null, isAuthenticated: false });
      },
      setHydrated: () => set({ _hasHydrated: true }),

      restore: async () => {
        if (ENV.USE_MOCKS) return;
        try {
          const user = await authService.me();
          set(user ? { user, isAuthenticated: true } : { user: null, isAuthenticated: false });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'stopix-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
