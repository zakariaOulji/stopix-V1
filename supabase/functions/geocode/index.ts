// Supabase Edge Function: geocode
// Proxies Google Places so the API key stays server-side (never in the app).
//
// Actions (POST JSON body):
//   { action: "autocomplete", query }  -> { predictions: [{ description, placeId }] }
//   { action: "details", placeId }     -> { address, lat, lng, postalCode, city }
//   { action: "geocode", query }       -> { address, lat, lng, postalCode, city } | {}
//
// Secret required:  GOOGLE_PLACES_KEY  (Google Cloud key with Places API + Geocoding API enabled)

const KEY = Deno.env.get('GOOGLE_PLACES_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function pick(components: AddressComponent[], type: string): string {
  return components?.find((c) => c.types.includes(type))?.long_name ?? '';
}

/** Decode a Google encoded polyline into {lat,lng} points. */
function decodePolyline(str: string): { lat: number; lng: number }[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords: { lat: number; lng: number }[] = [];
  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!KEY) return json({ error: 'GOOGLE_PLACES_KEY not set' }, 500);

  try {
    const { action, query, placeId, points } = await req.json();

    if (action === 'autocomplete') {
      if (!query || query.trim().length < 3) return json({ predictions: [] });
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(query)}&key=${KEY}&language=fr&types=address`;
      const res = await fetch(url);
      const data = await res.json();
      const predictions = (data.predictions ?? []).map((p: { description: string; place_id: string }) => ({
        description: p.description,
        placeId: p.place_id,
      }));
      return json({ predictions });
    }

    if (action === 'details') {
      if (!placeId) return json({ error: 'placeId required' }, 400);
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(placeId)}&key=${KEY}&language=fr` +
        `&fields=geometry,address_components,formatted_address`;
      const res = await fetch(url);
      const data = await res.json();
      const r = data.result;
      if (!r?.geometry) return json({});
      return json({
        address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        postalCode: pick(r.address_components, 'postal_code'),
        city: pick(r.address_components, 'locality'),
      });
    }

    if (action === 'geocode') {
      if (!query) return json({});
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(query)}&key=${KEY}&language=fr`;
      const res = await fetch(url);
      const data = await res.json();
      const r = data.results?.[0];
      if (!r?.geometry) return json({});
      return json({
        address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        postalCode: pick(r.address_components, 'postal_code'),
        city: pick(r.address_components, 'locality'),
      });
    }

    if (action === 'directions') {
      const pts: { lat: number; lng: number }[] = Array.isArray(points) ? points : [];
      if (pts.length < 2) return json({ polyline: pts, distanceKm: 0, durationMin: 0 });

      // Google Directions allows ~25 points per request -> chunk with 1-point overlap.
      const CHUNK = 25;
      const all: { lat: number; lng: number }[] = [];
      let meters = 0;
      let seconds = 0;
      let googleStatus = '';
      let googleError = '';

      for (let i = 0; i < pts.length - 1; i += CHUNK - 1) {
        const seg = pts.slice(i, i + CHUNK);
        if (seg.length < 2) break;
        const origin = `${seg[0].lat},${seg[0].lng}`;
        const dest = `${seg[seg.length - 1].lat},${seg[seg.length - 1].lng}`;
        const way = seg.slice(1, -1).map((p) => `${p.lat},${p.lng}`).join('|');
        const url =
          `https://maps.googleapis.com/maps/api/directions/json` +
          `?origin=${origin}&destination=${dest}` +
          (way ? `&waypoints=${encodeURIComponent(way)}` : '') +
          `&mode=driving&key=${KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        googleStatus = data.status ?? '';
        if (data.error_message) googleError = data.error_message;
        const route = data.routes?.[0];
        if (route) {
          const decoded = decodePolyline(route.overview_polyline.points);
          if (all.length > 0 && decoded.length > 0) decoded.shift(); // drop shared boundary point
          all.push(...decoded);
          for (const leg of route.legs ?? []) {
            meters += leg.distance?.value ?? 0;
            seconds += leg.duration?.value ?? 0;
          }
        }
      }

      return json({
        polyline: all,
        distanceKm: +(meters / 1000).toFixed(1),
        durationMin: Math.round(seconds / 60),
        ...(all.length === 0 ? { googleStatus, googleError } : {}),
      });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
