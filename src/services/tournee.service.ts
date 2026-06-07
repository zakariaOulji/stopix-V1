import { ENV } from '@/config/env';
import { api } from '@/api';
import { tourneesMock, stopsMock, fakeDelay } from '@/mocks';
import type { FailureReason, Stop, StopStatus, Tournee } from '@/types';

export interface CreateTourneePayload {
  name: string;
  addresses: string[];
}

export interface UpdateStopPayload {
  status: StopStatus;
  failureReason?: FailureReason;
  completedAt?: string;
}

/**
 * Tournee/stop data access. In mock mode everything resolves locally; the real
 * branch documents the exact endpoints the backend must expose.
 *
 * When wiring the backend, replace the `*Mock` returns and ensure the API
 * returns the same shapes as `Tournee` / `Stop` (or add mappers here).
 */
export const tourneeService = {
  async getTournees(): Promise<Tournee[]> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(500);
      return tourneesMock;
    }
    return api.get<Tournee[]>('/tournees');
  },

  async getStops(tourneeId: string): Promise<Stop[]> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(400);
      return stopsMock.filter((s) => s.tourneeId === tourneeId);
    }
    return api.get<Stop[]>(`/tournees/${tourneeId}/stops`);
  },

  async createTournee(payload: CreateTourneePayload): Promise<{ tournee: Tournee; stops: Stop[] }> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(800);
      // The screen builds the optimistic objects in mock mode; this is a no-op shape.
      throw new Error('createTournee is handled locally in mock mode');
    }
    return api.post<{ tournee: Tournee; stops: Stop[] }>('/tournees', payload);
  },

  async startTournee(tourneeId: string): Promise<void> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(600);
      return;
    }
    await api.post(`/tournees/${tourneeId}/start`);
  },

  async updateStop(stopId: string, payload: UpdateStopPayload): Promise<void> {
    if (ENV.USE_MOCKS) {
      // optimistic local update already applied in the store
      return;
    }
    await api.patch(`/stops/${stopId}`, payload);
  },
};
