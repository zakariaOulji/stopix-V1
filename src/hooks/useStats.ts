import { useEffect, useState } from 'react';
import { statsService } from '@/services';
import { statsMock } from '@/mocks';
import type { Stats } from '@/types';

/**
 * Provides dashboard/profile statistics through the service layer.
 * Seeds with mock data for instant render, then refreshes from the service
 * (identical in mock mode; a real fetch once the backend is connected).
 */
export function useStats(): { stats: Stats; loading: boolean } {
  const [stats, setStats] = useState<Stats>(statsMock);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    statsService
      .getStats()
      .then((s) => active && setStats(s))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { stats, loading };
}
