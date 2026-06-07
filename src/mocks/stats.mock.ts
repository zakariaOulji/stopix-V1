import type { Stats } from '@/types';

/** Dashboard / profile statistics. weeklyDeliveries = Mon..Sun. */
export const statsMock: Stats = {
  deliveriesToday: 14,
  successRate: 92,
  distanceKm: 47,
  durationMin: 312,
  weeklyDeliveries: [8, 12, 9, 15, 14, 0, 0],
  co2Saved: 3.2,
  totalDeliveries: 1284,
  totalDistanceKm: 4317,
};
