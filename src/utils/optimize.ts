/**
 * Local route optimization (no API): nearest-neighbor + 2-opt on straight-line
 * (haversine) distances. Good enough for a typical urban tournée (< ~30 stops).
 */
export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function routeDistance(order: number[], points: LatLng[], start?: LatLng): number {
  if (order.length === 0) return 0;
  let total = 0;
  let prev = start ?? points[order[0]];
  for (const idx of order) {
    total += haversine(prev, points[idx]);
    prev = points[idx];
  }
  return total;
}

function nearestNeighbor(points: LatLng[], start?: LatLng): number[] {
  const n = points.length;
  const visited = new Array(n).fill(false);
  const order: number[] = [];
  let current = start ?? points[0];
  for (let k = 0; k < n; k++) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      const d = haversine(current, points[i]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    visited[best] = true;
    order.push(best);
    current = points[best];
  }
  return order;
}

function twoOpt(initial: number[], points: LatLng[], start?: LatLng): number[] {
  let best = [...initial];
  let bestD = routeDistance(best, points, start);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const d = routeDistance(candidate, points, start);
        if (d < bestD - 1e-9) {
          best = candidate;
          bestD = d;
          improved = true;
        }
      }
    }
  }
  return best;
}

export interface OptimizeResult {
  /** New order = indices into the original `points` array. */
  order: number[];
  /** Optimized total distance (km), including start -> first stop if `start` given. */
  distanceKm: number;
  /** Percentage reduction vs the original order (0..100). */
  improvement: number;
}

export function optimizeRoute(points: LatLng[], start?: LatLng): OptimizeResult {
  const n = points.length;
  if (n <= 1) return { order: points.map((_, i) => i), distanceKm: 0, improvement: 0 };

  const original = points.map((_, i) => i);
  const originalD = routeDistance(original, points, start);

  let order = nearestNeighbor(points, start);
  order = twoOpt(order, points, start);
  const optD = routeDistance(order, points, start);

  const improvement = originalD > 0 ? Math.max(0, Math.round((1 - optD / originalD) * 100)) : 0;
  return { order, distanceKm: +optD.toFixed(1), improvement };
}
