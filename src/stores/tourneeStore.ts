import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Stop, StopStatus, Tournee, FailureReason } from '@/types';
import { tourneesMock, stopsMock } from '@/mocks';
import { tourneeService, routeService } from '@/services';
import { totalTourneeDuration } from '@/utils/format';
import { optimizeRoute } from '@/utils/optimize';
import { getCurrentPosition } from '@/utils/location';
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

/**
 * Server writes are fire-and-forget (optimistic UI). Instead of swallowing a
 * failure, log it and surface it so the driver knows the server is out of sync.
 */
const syncFailed = (action: string) => (e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  console.warn(`[sync] ${action}:`, message);
  useTourneeStore.setState({ syncError: `${action} (${message})` });
};

interface TourneeState {
  tournees: Tournee[];
  stops: Stop[];
  activeTourneeId: string | null;
  currentStopIndex: number;
  /** Last failed server write, shown to the user until dismissed. Not persisted. */
  syncError: string | null;
  clearSyncError: () => void;

  // selectors
  getStopsFor: (tourneeId: string) => Stop[];
  getActiveTournee: () => Tournee | undefined;
  getCurrentStop: () => Stop | undefined;

  // actions
  /** Load tournees + active stops from the service (backend seam). */
  load: () => Promise<void>;
  /** Fetch a tournée's stops from the server if they are not in the store yet. */
  ensureStops: (tourneeId: string) => Promise<void>;
  startTournee: (tourneeId: string) => Promise<void>;
  setCurrentStopIndex: (index: number) => void;
  nextStop: () => void;
  markDelivered: (
    stopId: string,
    proof?: { proofUrl?: string; signatureUrl?: string; lat?: number; lng?: number; deliveredAt?: string },
  ) => void;
  /** Attach proof URLs after a background upload finishes (stop already delivered). */
  attachProof: (stopId: string, proof: { proofUrl?: string; signatureUrl?: string }) => void;
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
  /** Re-optimize the order of the remaining (pending) stops from the GPS position. */
  optimizeTournee: (tourneeId: string) => Promise<{ reordered: boolean; usedGps: boolean }>;
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
  syncError: null,

  clearSyncError: () => set({ syncError: null }),

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

  ensureStops: async (tourneeId) => {
    // `load` only fetches the active tournée's stops; others are fetched on demand.
    if (ENV.USE_MOCKS || get().stops.some((s) => s.tourneeId === tourneeId)) return;
    const fresh = await tourneeService.getStops(tourneeId);
    set((state) => {
      const stops = [...state.stops.filter((s) => s.tourneeId !== tourneeId), ...fresh];
      return { stops, tournees: state.tournees.map((t) => (t.id === tourneeId ? recountTournee(t, stops) : t)) };
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

  markDelivered: (stopId, proof) => {
    const completedAt = nowHHMM();
    const deliveredAt = proof?.deliveredAt ?? new Date().toISOString();
    const extra: Partial<Stop> = {
      completedAt,
      deliveredAt,
      proofUrl: proof?.proofUrl,
      signatureUrl: proof?.signatureUrl,
      proofLat: proof?.lat,
      proofLng: proof?.lng,
    };
    void tourneeService
      .updateStop(stopId, {
        status: 'delivered',
        completedAt,
        deliveredAt,
        proofUrl: proof?.proofUrl,
        signatureUrl: proof?.signatureUrl,
        proofLat: proof?.lat,
        proofLng: proof?.lng,
      })
      .catch(syncFailed('Livraison non enregistrée'));
    set((state) => {
      const stops = applyStatus(state.stops, stopId, 'delivered', extra);
      return { stops, tournees: state.tournees.map((t) => recountTournee(t, stops)) };
    });
  },

  attachProof: (stopId, proof) => {
    void tourneeService.setStopProof(stopId, proof.proofUrl, proof.signatureUrl).catch(syncFailed('Preuve non enregistrée'));
    set((state) => ({
      stops: state.stops.map((s) =>
        s.id === stopId
          ? {
              ...s,
              ...(proof.proofUrl ? { proofUrl: proof.proofUrl } : {}),
              ...(proof.signatureUrl ? { signatureUrl: proof.signatureUrl } : {}),
            }
          : s,
      ),
    }));
  },

  markFailed: (stopId, reason) => {
    const completedAt = nowHHMM();
    void tourneeService
      .updateStop(stopId, { status: 'failed', completedAt, failureReason: reason })
      .catch(syncFailed('Échec non enregistré'));
    set((state) => {
      const stops = applyStatus(state.stops, stopId, 'failed', { ...NO_PROOF, completedAt, failureReason: reason });
      return { stops, tournees: state.tournees.map((t) => recountTournee(t, stops)) };
    });
  },

  skipStop: (stopId) => {
    void tourneeService.updateStop(stopId, { status: 'skipped' }).catch(syncFailed('Stop passé non enregistré'));
    set((state) => {
      const stops = applyStatus(state.stops, stopId, 'skipped', NO_PROOF);
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
    await tourneeService.completeTournee(tourneeId, endTime).catch(syncFailed('Fin de tournée non enregistrée'));
  },

  deleteTournee: async (tourneeId) => {
    set((state) => ({
      tournees: state.tournees.filter((t) => t.id !== tourneeId),
      stops: state.stops.filter((s) => s.tourneeId !== tourneeId),
      activeTourneeId: state.activeTourneeId === tourneeId ? null : state.activeTourneeId,
    }));
    if (!ENV.USE_MOCKS) await tourneeService.deleteTournee(tourneeId).catch(syncFailed('Suppression non enregistrée'));
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
            ...NO_PROOF,
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
        .catch(syncFailed('Réinitialisation non enregistrée'));
    }
  },

  updateTourneeStops: async (tourneeId, stopInputs) => {
    const applyLocal = (stops: Stop[]) =>
      set((state) => {
        const all = [...state.stops.filter((s) => s.tourneeId !== tourneeId), ...stops];
        return { stops: all, tournees: state.tournees.map((t) => (t.id === tourneeId ? recountTournee(t, all) : t)) };
      });

    const finalStops: Stop[] = ENV.USE_MOCKS
      ? stopInputs.map((s, i) => ({ ...s, id: `${tourneeId}-stop-${i + 1}`, tourneeId }))
      : await tourneeService.replaceStops(tourneeId, stopInputs);
    applyLocal(finalStops);

    // Recompute + persist real metrics for the new stop set.
    const route = await routeService.getRoutePolyline(finalStops.map((s) => ({ lat: s.lat, lng: s.lng })));
    if (route) {
      const durationMin = totalTourneeDuration(route.durationMin, finalStops.length);
      set((state) => ({
        tournees: state.tournees.map((t) =>
          t.id === tourneeId ? { ...t, distanceKm: route.distanceKm, estimatedDurationMin: durationMin } : t,
        ),
      }));
      if (!ENV.USE_MOCKS) {
        await tourneeService.setTourneeMetrics(tourneeId, route.distanceKm, durationMin).catch(syncFailed('Distance/durée non enregistrées'));
      }
    }
  },

  optimizeTournee: async (tourneeId) => {
    const gps = await getCurrentPosition();
    const mine = get()
      .stops.filter((s) => s.tourneeId === tourneeId)
      .sort((a, b) => a.order - b.order);
    const handled = mine.filter((s) => s.status !== 'pending');
    const pending = mine.filter((s) => s.status === 'pending');
    if (pending.length < 2) return { reordered: false, usedGps: !!gps };

    // Start from GPS, else from the last handled stop.
    const last = handled[handled.length - 1];
    const start = gps ?? (last ? { lat: last.lat, lng: last.lng } : undefined);
    const { order } = optimizeRoute(pending.map((s) => ({ lat: s.lat, lng: s.lng })), start ?? undefined);
    const optimizedPending = order.map((i) => pending[i]);

    const reordered = [...handled, ...optimizedPending].map((s, i) => ({ ...s, order: i + 1 }));
    const byId = new Map(reordered.map((s) => [s.id, s]));
    set((state) => {
      const stops = state.stops.map((s) => byId.get(s.id) ?? s);
      return { stops, currentStopIndex: firstPendingIndex(stops, tourneeId) };
    });

    if (!ENV.USE_MOCKS) {
      await tourneeService
        .setStopsOrder(reordered.map((s) => ({ id: s.id, order: s.order })))
        .catch(syncFailed('Nouvel ordre non enregistré'));
      // Refresh distance/duration for the new order.
      const route = await routeService.getRoutePolyline(reordered.map((s) => ({ lat: s.lat, lng: s.lng })));
      if (route) {
        const durationMin = totalTourneeDuration(route.durationMin, reordered.length);
        set((state) => ({
          tournees: state.tournees.map((t) =>
            t.id === tourneeId ? { ...t, distanceKm: route.distanceKm, estimatedDurationMin: durationMin } : t,
          ),
        }));
        await tourneeService.setTourneeMetrics(tourneeId, route.distanceKm, durationMin).catch(syncFailed('Distance/durée non enregistrées'));
      }
    }
    return { reordered: true, usedGps: !!gps };
  },

  renameTournee: async (tourneeId, name) => {
    set((state) => ({
      tournees: state.tournees.map((t) => (t.id === tourneeId ? { ...t, name } : t)),
    }));
    if (!ENV.USE_MOCKS) await tourneeService.renameTournee(tourneeId, name).catch(syncFailed('Renommage non enregistré'));
  },

  addTournee: (tournee, stops) =>
    set((state) => ({
      tournees: [tournee, ...state.tournees],
      stops: [...state.stops, ...stops],
    })),

  createTournee: async (name, stopInputs) => {
    // Real road distance + driving time (Google Directions, cached) → persisted.
    const route = await routeService.getRoutePolyline(
      stopInputs.map((s) => ({ lat: s.lat, lng: s.lng })),
    );
    const distanceKm = route?.distanceKm ?? +(stopInputs.length * 1.4).toFixed(1);
    const durationMin =
      route?.durationMin != null
        ? totalTourneeDuration(route.durationMin, stopInputs.length)
        : stopInputs.length * 12;

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
        distanceKm,
        estimatedDurationMin: durationMin,
        region: PARIS_CENTER,
      };
      set((state) => ({ tournees: [tournee, ...state.tournees], stops: [...state.stops, ...stops] }));
      return id;
    }
    const { tournee, stops } = await tourneeService.createTournee({
      name,
      stops: stopInputs,
      distanceKm,
      durationMin,
    });
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

/** Proof fields cleared when a stop is reset or ends up not delivered. */
const NO_PROOF: Partial<Stop> = {
  proofUrl: undefined,
  signatureUrl: undefined,
  proofLat: undefined,
  proofLng: undefined,
  deliveredAt: undefined,
};

function applyStatus(
  stops: Stop[],
  stopId: string,
  status: StopStatus,
  extra: Partial<Stop>,
): Stop[] {
  return stops.map((s) => (s.id === stopId ? { ...s, status, ...extra } : s));
}

