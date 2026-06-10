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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!KEY) return json({ error: 'GOOGLE_PLACES_KEY not set' }, 500);

  try {
    const { action, query, placeId } = await req.json();

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

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
