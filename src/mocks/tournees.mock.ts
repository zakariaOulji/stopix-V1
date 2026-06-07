import type { Tournee } from '@/types';

const today = '2026-06-03';
const yesterday = '2026-06-02';
const tomorrow = '2026-06-04';

/**
 * 3 tournees:
 *  - active   : 12 stops, 4 delivered, in progress
 *  - completed: yesterday, 18 stops, 100% success
 *  - planned  : tomorrow, 8 stops, not started
 */
export const tourneesMock: Tournee[] = [
  {
    id: 'tournee-active',
    name: 'Tournée Paris 11e — Matin',
    status: 'active',
    date: today,
    stopsCount: 12,
    deliveredCount: 4,
    failedCount: 1,
    distanceKm: 14.6,
    estimatedDurationMin: 185,
    startTime: '09:00',
    region: { latitude: 48.857, longitude: 2.378 },
  },
  {
    id: 'tournee-done',
    name: 'Tournée Paris 12e — Express',
    status: 'completed',
    date: yesterday,
    stopsCount: 18,
    deliveredCount: 18,
    failedCount: 0,
    distanceKm: 22.3,
    estimatedDurationMin: 240,
    startTime: '08:30',
    endTime: '13:10',
    region: { latitude: 48.8404, longitude: 2.3876 },
  },
  {
    id: 'tournee-planned',
    name: 'Tournée Paris 20e — Après-midi',
    status: 'planned',
    date: tomorrow,
    stopsCount: 8,
    deliveredCount: 0,
    failedCount: 0,
    distanceKm: 9.8,
    estimatedDurationMin: 120,
    startTime: '14:00',
    region: { latitude: 48.8649, longitude: 2.3984 },
  },
];

export const activeTourneeId = 'tournee-active';
