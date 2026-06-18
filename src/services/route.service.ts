import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';
import { haversine, type LatLng } from '@/utils/optimize';

export interface RouteResult {
  /** Decoded road polyline (or straight line through the points in mock mode). */
  polyline: LatLng[];
  distanceKm: number;
  durationMin: number;
}

const cache = new Map<string, RouteResult>();
const signature = (points: LatLng[]) =>
  points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');

export const routeService = {
  /**
   * Returns a road-following polyline through the ordered points (via Google
   * Directions, proxied by the `geocode` Edge Function). In mock mode (or on
   * failure) falls back to a straight line through the points.
   */
  async getRoutePolyline(points: LatLng[]): Promise<RouteResult | null> {
    if (points.length < 2) return null;
    const key = signature(points);
    const cached = cache.get(key);
    if (cached) return cached;

    const straightFallback = (): RouteResult => {
      let km = 0;
      for (let i = 1; i < points.length; i++) km += haversine(points[i - 1], points[i]);
      return { polyline: points, distanceKm: +km.toFixed(1), durationMin: Math.round(km * 3) };
    };

    if (ENV.USE_MOCKS) {
      const res = straightFallback();
      cache.set(key, res);
      return res;
    }

    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { action: 'directions', points },
    });
    const hasRoute = !error && Array.isArray(data?.polyline) && data.polyline.length > 0;
    if (!hasRoute) {
      // Diagnostic: why did the real route fail? (shows in Metro logs)
      console.warn(
        '[STOPIX] route → fallback lignes droites :',
        error?.message ?? data?.googleError ?? data?.error ?? data?.googleStatus ?? 'réponse vide (fonction non déployée ?)',
      );
    }
    const res = hasRoute ? (data as RouteResult) : straightFallback();
    cache.set(key, res);
    return res;
  },
};
