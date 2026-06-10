import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Stop, StopStatus, Tournee, FailureReason } from '@/types';
import { tourneesMock, stopsMock } from '@/mocks';
import { tourneeService } from '@/services';
import { ENV } from '@/config/env';

const PARIS_CENTER = { latitude: 48.8566, longitude: 2.3522 };

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
  /** Mark a tournée as completed (last stop done, or manual finish). */
  finishTournee: (tourneeId: string) => Promise<void>;
  /** Delete a tournée and its stops. */
  deleteTournee: (tourneeId: string) => Promise<void>;
  /** Relaunch a tournée in place with today's quantities (reset statuses). */
  reuseTournee: (
    tourneeId: string,
    quantities: Record<string, { packages: number; vrac: number }>,
  ) => Promise<void>;
  /** Replace a tournée's stops (when editing it). */
  updateTourneeStops: (tourneeId: string, stops: Omit<Stop, 'id' | 'tourneeId'>[]) => Promise<void>;
  /** Rename a tournée. */
  renameTournee: (tourneeId: string, name: string) => Promise<void>;
  addTournee: (tournee: Tournee, stops: Stop[]) => void;
  /** Create a tournée (locally in mock mode, via Supabase otherwise). Returns its id. */
  createTournee: (name: string, stops: Omit<Stop, 'id' | 'tourneeId'>[]) => Promise<string>;
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

  finishTournee: async (tourneeId) => {
    const endTime = nowHHMM();
    set((state) => ({
      tournees: state.tournees.map((t) =>
        t.id === tourneeId ? { ...t, status: 'completed', endTime } : t,
      ),
    }));
    await tourneeService.completeTournee(tourneeId, endTime).catch(() => {});
  },

  deleteTournee: async (tourneeId) => {
    set((state) => ({
      tournees: state.tournees.filter((t) => t.id !== tourneeId),
      stops: state.stops.filter((s) => s.tourneeId !== tourneeId),
      activeTourneeId: state.activeTourneeId === tourneeId ? null : state.activeTourneeId,
    }));
    if (!ENV.USE_MOCKS) await tourneeService.deleteTournee(tourneeId).catch(() => {});
  },

  reuseTournee: async (tourneeId, quantities) => {
    const startTime = nowHHMM();
    const dateIso = new Date().toISOString();
    const newStops = get().stops.map((s) =>
      s.tourneeId === tourneeId
        ? {
            ...s,
            status: 'pending' as const,
            completedAt: undefined,
            failureReason: undefined,
            packages: quantities[s.id]?.packages ?? s.packages,
            vrac: quantities[s.id]?.vrac ?? s.vrac,
          }
        : s,
    );
    const newTournees = get().tournees.map((t) =>
      t.id === tourneeId
        ? {
            ...t,
            status: 'active' as const,
            date: dateIso,
            startTime,
            endTime: undefined,
            deliveredCount: 0,
            failedCount: 0,
          }
        : t,
    );
    set({
      stops: newStops,
      tournees: newTournees,
      activeTourneeId: tourneeId,
      currentStopIndex: firstPendingIndex(newStops, tourneeId),
    });
    if (!ENV.USE_MOCKS) {
      const updates = newStops
        .filter((s) => s.tourneeId === tourneeId)
        .map((s) => ({ id: s.id, packages: s.packages, vrac: s.vrac ?? 0 }));
      await tourneeService
        .reuseTournee(tourneeId, { date: dateIso.slice(0, 10), startTime, stops: updates })
        .catch(() => {});
    }
  },

  updateTourneeStops: async (tourneeId, stopInputs) => {
    const applyLocal = (stops: Stop[]) =>
      set((state) => {
        const all = [...state.stops.filter((s) => s.tourneeId !== tourneeId), ...stops];
        return { stops: all, tournees: state.tournees.map((t) => (t.id === tourneeId ? recountTournee(t, all) : t)) };
      });

    if (ENV.USE_MOCKS) {
      const stops: Stop[] = stopInputs.map((s, i) => ({ ...s, id: `${tourneeId}-stop-${i + 1}`, tourneeId }));
      applyLocal(stops);
      return;
    }
    const stops = await tourneeService.replaceStops(tourneeId, stopInputs);
    applyLocal(stops);
  },

  renameTournee: async (tourneeId, name) => {
    set((state) => ({
      tournees: state.tournees.map((t) => (t.id === tourneeId ? { ...t, name } : t)),
    }));
    if (!ENV.USE_MOCKS) await tourneeService.renameTournee(tourneeId, name).catch(() => {});
  },

  addTournee: (tournee, stops) =>
    set((state) => ({
      tournees: [tournee, ...state.tournees],
      stops: [...state.stops, ...stops],
    })),

  createTournee: async (name, stopInputs) => {
    if (ENV.USE_MOCKS) {
      const id = `tournee-${Date.now()}`;
      const stops: Stop[] = stopInputs.map((s, i) => ({
        ...s,
        id: `${id}-stop-${i + 1}`,
        tourneeId: id,
      }));
      const tournee: Tournee = {
        id,
        name,
        status: 'planned',
        date: new Date().toISOString(),
        stopsCount: stops.length,
        deliveredCount: 0,
        failedCount: 0,
        distanceKm: +(stops.length * 1.4).toFixed(1),
        estimatedDurationMin: stops.length * 12,
        region: PARIS_CENTER,
      };
      set((state) => ({ tournees: [tournee, ...state.tournees], stops: [...state.stops, ...stops] }));
      return id;
    }
    const { tournee, stops } = await tourneeService.createTournee({ name, stops: stopInputs });
    set((state) => ({ tournees: [tournee, ...state.tournees], stops: [...state.stops, ...stops] }));
    return tournee.id;
  },

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

