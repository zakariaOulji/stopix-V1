import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';

export interface AddressPrediction {
  description: string;
  placeId: string;
}

export interface GeocodeResult {
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
}

/** Deterministic fake geocode (mock mode) — coords scattered around Paris. */
function mockGeocode(text: string): GeocodeResult {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  const lat = 48.8566 + (((h % 1000) / 1000) - 0.5) * 0.06;
  const lng = 2.3522 + ((((h >> 10) % 1000) / 1000) - 0.5) * 0.08;
  const parts = text.split(',');
  return {
    address: parts[0].trim(),
    postalCode: parts[1]?.trim()?.match(/\d{5}/)?.[0] ?? '75001',
    city: 'Paris',
    lat,
    lng,
  };
}

export const geocodeService = {
  /** Address suggestions as the user types. */
  async autocomplete(query: string): Promise<AddressPrediction[]> {
    if (query.trim().length < 3) return [];
    if (ENV.USE_MOCKS) return [{ description: query, placeId: `mock:${query}` }];
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { action: 'autocomplete', query },
    });
    if (error) return [];
    return (data?.predictions ?? []) as AddressPrediction[];
  },

  /** Resolve a selected prediction into full coordinates. */
  async details(placeId: string, fallbackText = ''): Promise<GeocodeResult | null> {
    if (ENV.USE_MOCKS || placeId.startsWith('mock:')) {
      return mockGeocode(placeId.startsWith('mock:') ? placeId.slice(5) : fallbackText);
    }
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { action: 'details', placeId },
    });
    if (error || !data?.lat) return null;
    return data as GeocodeResult;
  },

  /** Forward-geocode free text (when no suggestion was picked). */
  async geocode(query: string): Promise<GeocodeResult | null> {
    if (ENV.USE_MOCKS) return mockGeocode(query);
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { action: 'geocode', query },
    });
    if (error || !data?.lat) return null;
    return data as GeocodeResult;
  },
};
