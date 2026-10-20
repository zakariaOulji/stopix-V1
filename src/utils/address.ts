/** A position counts as real only if both coords are set and not the 0,0 placeholder. */
export function isLocated(p: { lat?: number | null; lng?: number | null }): p is { lat: number; lng: number } {
  return (
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    !(p.lat === 0 && p.lng === 0)
  );
}

/** Postal code typed in a free-text address: 4 digits (BE, LU, CH…) or 5 (FR, DE…). */
export function postalCodeFrom(address: string): string {
  return address.match(/\b\d{4,5}\b/)?.[0] ?? '';
}
