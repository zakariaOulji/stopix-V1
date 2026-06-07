import { create } from 'zustand';
import type { AppNotification } from '@/types';
import { notificationsMock } from '@/mocks';

interface UiState {
  isLoading: boolean;
  bottomSheetVisible: boolean;
  notifications: AppNotification[];

  setLoading: (v: boolean) => void;
  setBottomSheetVisible: (v: boolean) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: () => number;
}

export const useUiStore = create<UiState>((set, get) => ({
  isLoading: false,
  bottomSheetVisible: false,
  notifications: notificationsMock,

  setLoading: (v) => set({ isLoading: v }),
  setBottomSheetVisible: (v) => set({ bottomSheetVisible: v }),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
