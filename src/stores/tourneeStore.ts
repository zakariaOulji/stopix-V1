import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Stop, StopStatus, Tournee, FailureReason } from '@/types';
import { tourneesMock, stopsMock } from '@/mocks';
import { tourneeService } from '@/services';

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const recountTournee = (t: Tournee, stops: Stop[]): Tournee => {
  const mine = stops.filter((s) => s.tourneeId === t.id);
  if (mine.length === 0) return t;
  return {
    ...t,
    stopsCount: mine.length,
    deliveredCount: mine.filter((s) => s.status === 'delivered').length,
    failedCount: mine.filter((s) => s.status === 'failed').length,
  };
};

interface TourneeState {
  tournees: Tournee[];
  stops: Stop[];
  activeTourneeId: string | null;
  currentStopIndex: number;

  // selectors
  getStopsFor: (tourneeId: string) => Stop[];
  getActiveTournee: () => Tournee | undefined;
  getCurrentStop: () => Stop | undefined;

  // actions
  /** Load tournees + active stops from the service (backend seam). */
  load: () => Promise<void>;
  startTournee: (tourneeId: string) => Promise<void>;
  setCurrentStopIndex: (index: number) => void;
  nextStop: () => void;
  markDelivered: (stopId: string) => void;
  markFailed: (stopId: string, reason: FailureReason) => void;
  skipStop: (stopId: string) => void;
  addTournee: (tournee: Tournee, stops: Stop[]) => void;
  resetMocks: () => void;
}

const orderedActiveStops = (stops: Stop[], tourneeId: string | null) =>
  stops
    .filter((s) => s.tourneeId === tourneeId)
    .sort((a, b) => a.order - b.order);

/** Index of the first non-completed stop in the active tournee. */
const firstPendingIndex = (stops: Stop[], tourneeId: string | null) => {
  const list = orderedActiveStops(stops, tourneeId);
  const idx = list.findIndex((s) => s.status === 'pending');
  return idx === -1 ? Math.max(0, list.length - 1) : idx;
};

export const useTourneeStore = create<TourneeState>()(
  persist(
    (set, get) => ({
  tournees: tourneesMock,
  stops: stopsMock,
  activeTourneeId: 'tournee-active',
  currentStopIndex: firstPendingIndex(stopsMock, 'tournee-active'),

  getStopsFor: (tourneeId) =>
    get().stops.filter((s) => s.tourneeId === tourneeId).sort((a, b) => a.order - b.order),

  getActiveTournee: () => get().tournees.find((t) => t.id === get().activeTourneeId),

  getCurrentStop: () => {
    const list = orderedActiveStops(get().stops, get().activeTourneeId);
    return list[get().currentStopIndex];
  },

  load: async () => {
    const tournees = await tourneeService.getTournees();
    const active = tournees.find((t) => t.status === 'active');
    const stops = active ? await tourneeService.getStops(active.id) : [];
    set({
      tournees,
      stops,
      activeTourneeId: active?.id ?? null,
      currentStopIndex: firstPendingIndex(stops, active?.id ?? null),
    });
  },

  startTournee: async (tourneeId) => {
    await tourneeService.startTournee(tourneeId);
    set((state) => ({
      activeTourneeId: tourneeId,
      currentStopIndex: firstPendingIndex(state.stops, tourneeId),
      tournees: state.tournees.map((t) =>
        t.id === tourneeId && t.status === 'planned'
          ? { ...t, status: 'active', startTime: nowHHMM() }
          : t,
      ),
    }));
  },

  setCurrentStopIndex: (index) => set({ currentStopIndex: index }),

  nextStop: () =>
    set((state) => {
      const list = orderedActiveStops(state.stops, state.activeTourneeId);
      return { currentStopIndex: Math.min(state.currentStopIndex + 1, list.length - 1) };
    }),

  markDelivered: (stopId) => {
    const completedAt = nowHHMM();
    void tourneeService.updateStop(stopId, { status: 'delivered', completedAt }).catch(() => {});
    set((state) => {
      const stops = applyStatus(state.stops, stopId, 'delivered', { completedAt });
      return { stops, tournees: state.tournees.map((t) => recountTournee(t, stops)) };
    });
  },

  markFailed: (stopId, reason) => {
    const completedAt = nowHHMM();
    void tourneeService
      .updateStop(stopId, { status: 'failed', completedAt, failureReason: reason })
      .catch(() => {});
    set((state) => {
      const stops = applyStatus(state.stops, stopId, 'failed', { completedAt, failureReason: reason });
      return { stops, tournees: state.tournees.map((t) => recountTournee(t, stops)) };
    });
  },

  skipStop: (stopId) => {
    void tourneeService.updateStop(stopId, { status: 'skipped' }).catch(() => {});
    set((state) => {
      const stops = applyStatus(state.stops, stopId, 'skipped', {});
      return { stops, tournees: state.tournees.map((t) => recountTournee(t, stops)) };
    });
  },

  addTournee: (tournee, stops) =>
    set((state) => ({
      tournees: [tournee, ...state.tournees],
      stops: [...state.stops, ...stops],
    })),

  resetMocks: () =>
    set({
      tournees: tourneesMock,
      stops: stopsMock,
      activeTourneeId: 'tournee-active',
      currentStopIndex: firstPendingIndex(stopsMock, 'tournee-active'),
    }),
    }),
    {
      name: 'stopix-tournees',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        tournees: s.tournees,
        stops: s.stops,
        activeTourneeId: s.activeTourneeId,
        currentStopIndex: s.currentStopIndex,
      }),
    },
  ),
);

function applyStatus(
  stops: Stop[],
  stopId: string,
  status: StopStatus,
  extra: Partial<Stop>,
): Stop[] {
  return stops.map((s) => (s.id === stopId ? { ...s, status, ...extra } : s));
}
