// Supabase Edge Function: extract-addresses
// Extracts delivery stops from a photo of a (printed) route sheet using OpenAI
// GPT-4o vision. The OpenAI key stays server-side.
//
// POST JSON body: { imageBase64: string, mimeType?: string }
// Returns: { deliveries: [{ address, recipient, phone, packages, vrac }] }
//
// Secret required: OPENAI_API_KEY

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

const PROMPT = `Tu extrais les arrêts de livraison depuis la photo d'une feuille de route (imprimée, en français).
Renvoie UNIQUEMENT du JSON valide au format:
{"deliveries":[{"address":"","recipient":"","phone":"","packages":1,"vrac":0}]}
Règles:
- "address" = adresse de livraison la plus complète possible (numéro + rue + code postal + ville si présents).
- "recipient" = nom de la personne/commerce si présent, sinon "".
- "phone" = numéro de téléphone si présent (chiffres uniquement), sinon "".
- "packages" = nombre de colis (entier, défaut 1).
- "vrac" = nombre d'unités de vrac (entier, défaut 0).
- N'inclus QUE les lignes qui ont une adresse. Ignore les en-têtes/totaux.
- Ne renvoie rien d'autre que le JSON.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!OPENAI_KEY) return json({ error: 'OPENAI_API_KEY not set' }, 500);

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) return json({ error: 'imageBase64 required' }, 400);
    const dataUrl = `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message ?? 'OpenAI error' }, 502);

    const content = data.choices?.[0]?.message?.content ?? '{}';
    let parsed: { deliveries?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    const deliveries = Array.isArray(parsed.deliveries) ? parsed.deliveries : [];
    return json({ deliveries });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
