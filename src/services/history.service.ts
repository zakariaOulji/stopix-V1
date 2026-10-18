import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';
import { stopsMock, tourneesMock, fakeDelay } from '@/mocks';
import type { DeliveryRecord, FailureReason, StopStatus } from '@/types';

export type HistoryFilter = 'all' | Exclude<StopStatus, 'pending'>;

export interface HistoryPage {
  records: DeliveryRecord[];
  /** Pass back as `before` to load the next (older) page; null when done. */
  nextCursor: string | null;
}

interface DeliveryRow {
  id: string;
  tournee_id: string | null;
  stop_id: string | null;
  tournee_name: string;
  recipient: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  packages: number | null;
  vrac: number | null;
  status: DeliveryRecord['status'];
  failure_reason: FailureReason | null;
  happened_at: string;
  proof_url: string | null;
  signature_url: string | null;
  proof_lat: number | null;
  proof_lng: number | null;
  return_vrac: number;
  return_bags: number;
}

function mapDelivery(r: DeliveryRow): DeliveryRecord {
  return {
    id: r.id,
    tourneeId: r.tournee_id ?? undefined,
    stopId: r.stop_id ?? undefined,
    tourneeName: r.tournee_name,
    recipient: r.recipient,
    address: r.address,
    city: r.city ?? '',
    postalCode: r.postal_code ?? '',
    packages: r.packages ?? 0,
    vrac: r.vrac ?? 0,
    status: r.status,
    failureReason: r.failure_reason ?? undefined,
    happenedAt: r.happened_at,
    proofUrl: r.proof_url ?? undefined,
    signatureUrl: r.signature_url ?? undefined,
    proofLat: r.proof_lat ?? undefined,
    proofLng: r.proof_lng ?? undefined,
    returnVrac: r.return_vrac,
    returnBags: r.return_bags,
  };
}

/** Mock mode: build history from the finished mock stops. */
function mockHistory(filter: HistoryFilter): DeliveryRecord[] {
  const names = new Map(tourneesMock.map((t) => [t.id, t.name]));
  return stopsMock
    .filter((s) => s.status !== 'pending' && (filter === 'all' || s.status === filter))
    .map((s, i) => ({
      id: `mock-delivery-${s.id}`,
      tourneeId: s.tourneeId,
      stopId: s.id,
      tourneeName: names.get(s.tourneeId) ?? 'Tournée',
      recipient: s.recipient,
      address: s.address,
      city: s.city,
      postalCode: s.postalCode,
      packages: s.packages,
      vrac: s.vrac ?? 0,
      status: s.status as DeliveryRecord['status'],
      failureReason: s.failureReason,
      happenedAt: s.deliveredAt ?? new Date(Date.now() - i * 45 * 60_000).toISOString(),
      proofUrl: s.proofUrl,
      signatureUrl: s.signatureUrl,
      proofLat: s.proofLat,
      proofLng: s.proofLng,
      returnVrac: s.returnVrac ?? 0,
      returnBags: s.returnBags ?? 0,
    }))
    .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
}

export const historyService = {
  /** Most recent first, `limit` per page. RLS restricts rows to the current user. */
  async getDeliveries(opts: { filter?: HistoryFilter; before?: string | null; limit?: number } = {}): Promise<HistoryPage> {
    const { filter = 'all', before = null, limit = 30 } = opts;
    if (ENV.USE_MOCKS) {
      await fakeDelay(300);
      const all = mockHistory(filter).filter((r) => !before || r.happenedAt < before);
      const records = all.slice(0, limit);
      return { records, nextCursor: all.length > limit ? records[records.length - 1].happenedAt : null };
    }

    let query = supabase
      .from('deliveries')
      .select('*')
      .order('happened_at', { ascending: false })
      .limit(limit + 1); // one extra row tells whether there is a next page
    if (filter !== 'all') query = query.eq('status', filter);
    if (before) query = query.lt('happened_at', before);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data as DeliveryRow[]).map(mapDelivery);
    const records = rows.slice(0, limit);
    return { records, nextCursor: rows.length > limit ? records[records.length - 1].happenedAt : null };
  },
};
