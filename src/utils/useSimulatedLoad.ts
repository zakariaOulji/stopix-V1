import { useEffect, useState } from 'react';

/**
 * Simulates an initial data fetch so loading/skeleton states are exercised
 * while the app is still mock-only. Replace with real query loading later.
 */
export function useSimulatedLoad(ms = 600): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}
