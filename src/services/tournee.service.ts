import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';
import { tourneesMock, stopsMock, fakeDelay } from '@/mocks';
import type { FailureReason, Stop, StopStatus, Tournee } from '@/types';

export interface CreateTourneePayload {
  name: string;
  stops: Omit<Stop, 'id' | 'tourneeId'>[];
}

export interface UpdateStopPayload {
  status: StopStatus;
  failureReason?: FailureReason;
  completedAt?: string;
}

// ── Row types (snake_case) ────────────────────────────────────
interface TourneeRow {
  id: string;
  name: string;
  status: Tournee['status'];
  date: string;
  distance_km: number | string;
  estimated_duration_min: number;
  region_lat: number | null;
  region_lng: number | null;
  start_time: string | null;
  end_time: string | null;
}
interface StopRow {
  id: string;
  tournee_id: string;
  order: number;
  status: StopStatus;
  recipient: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  access_code: string | null;
  phone: string | null;
  packages: number;
  vrac: number | null;
  eta: string | null;
  completed_at: string | null;
  failure_reason: FailureReason | null;
}

function mapStop(r: StopRow): Stop {
  return {
    id: r.id,
    tourneeId: r.tournee_id,
    order: r.order,
    status: r.status,
    recipient: r.recipient,
    address: r.address,
    city: r.city ?? '',
    postalCode: r.postal_code ?? '',
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    notes: r.notes ?? undefined,
    accessCode: r.access_code ?? undefined,
    phone: r.phone ?? undefined,
    packages: r.packages,
    vrac: r.vrac ?? undefined,
    eta: r.eta ?? undefined,
    completedAt: r.completed_at ?? undefined,
    failureReason: r.failure_reason ?? undefined,
  };
}

function mapTournee(r: TourneeRow, counts: { total: number; delivered: number; failed: number }): Tournee {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    date: r.date,
    stopsCount: counts.total,
    deliveredCount: counts.delivered,
    failedCount: counts.failed,
    distanceKm: Number(r.distance_km),
    estimatedDurationMin: r.estimated_duration_min,
    startTime: r.start_time ?? undefined,
    endTime: r.end_time ?? undefined,
    region: { latitude: r.region_lat ?? 48.8566, longitude: r.region_lng ?? 2.3522 },
  };
}

export const tourneeService = {
  async getTournees(): Promise<Tournee[]> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(500);
      return tourneesMock;
    }
    const { data: tournees, error } = await supabase
      .from('tournees')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (tournees as TourneeRow[]).map((t) => t.id);
    const { data: stops } = ids.length
      ? await supabase.from('stops').select('tournee_id,status').in('tournee_id', ids)
      : { data: [] as { tournee_id: string; status: StopStatus }[] };

    const countFor = (id: string) => {
      const mine = (stops ?? []).filter((s) => s.tournee_id === id);
      return {
        total: mine.length,
        delivered: mine.filter((s) => s.status === 'delivered').length,
        failed: mine.filter((s) => s.status === 'failed').length,
      };
    };
    return (tournees as TourneeRow[]).map((t) => mapTournee(t, countFor(t.id)));
  },

  async getStops(tourneeId: string): Promise<Stop[]> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(400);
      return stopsMock.filter((s) => s.tourneeId === tourneeId);
    }
    const { data, error } = await supabase
      .from('stops')
      .select('*')
      .eq('tournee_id', tourneeId)
      .order('order', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as StopRow[]).map(mapStop);
  },

  async createTournee(payload: CreateTourneePayload): Promise<{ tournee: Tournee; stops: Stop[] }> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(800);
      throw new Error('createTournee is handled locally in mock mode');
    }
    const { data: userData } = await supabase.auth.getUser();
    const distanceKm = +(payload.stops.length * 1.4).toFixed(1);
    const { data: t, error: tErr } = await supabase
      .from('tournees')
      .insert({
        user_id: userData.user?.id,
        name: payload.name,
        status: 'planned',
        distance_km: distanceKm,
        estimated_duration_min: payload.stops.length * 12,
      })
      .select('*')
      .single();
    if (tErr) throw new Error(tErr.message);

    const rows = payload.stops.map((s) => ({
      tournee_id: (t as TourneeRow).id,
      order: s.order,
      status: s.status,
      recipient: s.recipient,
      address: s.address,
      city: s.city,
      postal_code: s.postalCode,
      lat: s.lat,
      lng: s.lng,
      notes: s.notes,
      access_code: s.accessCode,
      phone: s.phone,
      packages: s.packages,
      vrac: s.vrac ?? 0,
      eta: s.eta,
    }));
    const { data: inserted, error: sErr } = await supabase.from('stops').insert(rows).select('*');
    if (sErr) throw new Error(sErr.message);

    const stops = (inserted as StopRow[]).map(mapStop);
    return {
      tournee: mapTournee(t as TourneeRow, {
        total: stops.length,
        delivered: 0,
        failed: 0,
      }),
      stops,
    };
  },

  async startTournee(tourneeId: string): Promise<void> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(600);
      return;
    }
    const { error } = await supabase.from('tournees').update({ status: 'active' }).eq('id', tourneeId);
    if (error) throw new Error(error.message);
  },

  async completeTournee(tourneeId: string, endTime: string): Promise<void> {
    if (ENV.USE_MOCKS) return;
    const { error } = await supabase
      .from('tournees')
      .update({ status: 'completed', end_time: endTime })
      .eq('id', tourneeId);
    if (error) throw new Error(error.message);
  },

  async deleteTournee(tourneeId: string): Promise<void> {
    if (ENV.USE_MOCKS) return;
    const { error } = await supabase.from('tournees').delete().eq('id', tourneeId);
    if (error) throw new Error(error.message);
  },

  async renameTournee(tourneeId: string, name: string): Promise<void> {
    if (ENV.USE_MOCKS) return;
    const { error } = await supabase.from('tournees').update({ name }).eq('id', tourneeId);
    if (error) throw new Error(error.message);
  },

  /** Relaunch a tournée in place: reset its stops + apply today's quantities. */
  async reuseTournee(
    tourneeId: string,
    payload: { date: string; startTime: string; stops: { id: string; packages: number; vrac: number }[] },
  ): Promise<void> {
    if (ENV.USE_MOCKS) return;
    const { error: tErr } = await supabase
      .from('tournees')
      .update({ status: 'active', date: payload.date, start_time: payload.startTime, end_time: null })
      .eq('id', tourneeId);
    if (tErr) throw new Error(tErr.message);
    await Promise.all(
      payload.stops.map((s) =>
        supabase
          .from('stops')
          .update({ packages: s.packages, vrac: s.vrac, status: 'pending', completed_at: null, failure_reason: null })
          .eq('id', s.id),
      ),
    );
  },

  /** Replace all stops of a tournée (used when editing it). */
  async replaceStops(tourneeId: string, stops: Omit<Stop, 'id' | 'tourneeId'>[]): Promise<Stop[]> {
    if (ENV.USE_MOCKS) throw new Error('replaceStops is handled locally in mock mode');
    const { error: dErr } = await supabase.from('stops').delete().eq('tournee_id', tourneeId);
    if (dErr) throw new Error(dErr.message);
    const rows = stops.map((s) => ({
      tournee_id: tourneeId,
      order: s.order,
      status: s.status,
      recipient: s.recipient,
      address: s.address,
      city: s.city,
      postal_code: s.postalCode,
      lat: s.lat,
      lng: s.lng,
      notes: s.notes,
      access_code: s.accessCode,
      phone: s.phone,
      packages: s.packages,
      vrac: s.vrac ?? 0,
      eta: s.eta,
    }));
    const { data, error } = await supabase.from('stops').insert(rows).select('*');
    if (error) throw new Error(error.message);
    return (data as StopRow[]).map(mapStop).sort((a, b) => a.order - b.order);
  },

  async updateStop(stopId: string, payload: UpdateStopPayload): Promise<void> {
    if (ENV.USE_MOCKS) return;
    const { error } = await supabase
      .from('stops')
      .update({
        status: payload.status,
        failure_reason: payload.failureReason ?? null,
        completed_at: payload.completedAt ?? null,
      })
      .eq('id', stopId);
    if (error) throw new Error(error.message);
  },
};
