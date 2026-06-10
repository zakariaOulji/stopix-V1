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
