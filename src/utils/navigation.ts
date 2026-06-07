import { Linking, Platform } from 'react-native';

export type NavProvider = 'google' | 'waze' | 'apple' | 'system';

export interface NavTarget {
  lat: number;
  lng: number;
  label?: string;
}

interface ProviderUrls {
  app: string;
  web?: string;
}

function urlsFor(provider: NavProvider, { lat, lng, label = '' }: NavTarget): ProviderUrls {
  const q = encodeURIComponent(label);
  switch (provider) {
    case 'google':
      return {
        app: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        web: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      };
    case 'waze':
      return {
        app: `waze://?ll=${lat},${lng}&navigate=yes`,
        web: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      };
    case 'apple':
      return { app: `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` };
    case 'system':
    default:
      // Android `geo:` triggers the OS app chooser among installed map apps.
      return Platform.OS === 'ios'
        ? { app: `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` }
        : { app: `geo:${lat},${lng}?q=${lat},${lng}(${q})` };
  }
}

/** Open navigation in the chosen provider, falling back to its web URL if the app is absent. */
export async function openNavigation(provider: NavProvider, target: NavTarget): Promise<boolean> {
  const { app, web } = urlsFor(provider, target);
  try {
    await Linking.openURL(app);
    return true;
  } catch {
    if (web) {
      try {
        await Linking.openURL(web);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

interface ProviderMeta {
  provider: NavProvider;
  label: string;
  icon: string;
  color: string;
}

/** Provider options shown in the chooser, filtered per platform. */
export const NAV_PROVIDERS: ProviderMeta[] = [
  { provider: 'google', label: 'Google Maps', icon: 'navigate-circle', color: '#4285F4' },
  { provider: 'waze', label: 'Waze', icon: 'car-sport', color: '#33CCFF' },
  ...(Platform.OS === 'ios'
    ? [{ provider: 'apple' as NavProvider, label: 'Plans', icon: 'map', color: '#34C759' }]
    : []),
  {
    provider: 'system',
    label: Platform.OS === 'ios' ? 'App par défaut' : 'Autre app…',
    icon: 'apps',
    color: '#8A93A8',
  },
];

/** URL scheme used to probe whether a provider's app is installed. */
function probeScheme(provider: NavProvider): string | null {
  switch (provider) {
    case 'google':
      return 'comgooglemaps://';
    case 'waze':
      return 'waze://';
    case 'apple':
      return 'maps://';
    default:
      return null; // 'system' is always available
  }
}

/**
 * Returns only the providers whose app is actually installed (requires URL
 * scheme visibility — declared in app.json for native/dev builds).
 *
 * In Expo Go (or if detection finds nothing real), falls back to the full list
 * so navigation always works — `openNavigation` then web-fallbacks if needed.
 */
export async function getAvailableProviders(): Promise<ProviderMeta[]> {
  const results = await Promise.all(
    NAV_PROVIDERS.map(async (p) => {
      const scheme = probeScheme(p.provider);
      if (!scheme) return true; // 'system'
      if (p.provider === 'apple') return Platform.OS === 'ios';
      try {
        return await Linking.canOpenURL(scheme);
      } catch {
        return false;
      }
    }),
  );
  const available = NAV_PROVIDERS.filter((_, i) => results[i]);
  const hasRealApp = available.some((p) => p.provider !== 'system');
  return hasRealApp ? available : NAV_PROVIDERS;
}
