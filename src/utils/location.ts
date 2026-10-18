import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Returns the device's current position, or null if permission is denied or it
 * can't be obtained. Used as the start point for route optimization.
 */
export async function getCurrentPosition(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

const WATCH_DISTANCE_M = 25;

/** Great-circle distance in meters (haversine). */
function distanceMeters(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Continuously track the device position. Returns a subscription (call .remove()). */
export async function watchPosition(
  onChange: (c: Coords) => void,
): Promise<{ remove: () => void } | null> {
  // Web: use the browser API directly. expo-location 19's web subscription
  // crashes on remove() ("LocationEventEmitter.removeSubscription is not a
  // function") when the screen unmounts.
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    let last: Coords | null = null;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Same 25 m threshold as native `distanceInterval`.
        if (last && distanceMeters(last, next) < WATCH_DISTANCE_M) return;
        last = next;
        onChange(next);
      },
      () => {}, // denied / unavailable: no live position, like native
      { enableHighAccuracy: false, maximumAge: 10_000 },
    );
    return { remove: () => navigator.geolocation.clearWatch(id) };
  }
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    return Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: WATCH_DISTANCE_M },
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    );
  } catch {
    return null;
  }
}
