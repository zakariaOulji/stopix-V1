import { useEffect, useState } from 'react';
import { routeService } from '@/services';
import type { LatLng } from '@/utils/optimize';
import type { Stop } from '@/types';

/**
 * Fetches a road-following polyline through the (ordered) stops, optionally
 * starting from `start` (e.g. GPS position). Returns null while loading or if
 * unavailable — the map then falls back to straight lines.
 */
export function useRoutePolyline(
  stops: Stop[],
  start?: LatLng | null,
): { polyline: LatLng[] | null; distanceKm: number | null } {
  const [polyline, setPolyline] = useState<LatLng[] | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const points: LatLng[] = [
    ...(start ? [start] : []),
    ...[...stops].sort((a, b) => a.order - b.order).map((s) => ({ lat: s.lat, lng: s.lng })),
  ];
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|');

  useEffect(() => {
    let active = true;
    if (points.length < 2) {
      setPolyline(null);
      setDistanceKm(null);
      return;
    }
    routeService.getRoutePolyline(points).then((r) => {
      if (!active) return;
      setPolyline(r?.polyline ?? null);
      setDistanceKm(r?.distanceKm ?? null);
    });
    return () => {
      active = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { polyline, distanceKm };
}
