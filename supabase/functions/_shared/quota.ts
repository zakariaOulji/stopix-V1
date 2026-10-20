// Shared by the paid edge functions (geocode, extract-addresses): reserve
// daily quota for the calling user before hitting OpenAI / Google.
// Limits live in public.api_limits (see migration_10_usage_limits.sql).
import { createClient } from 'npm:@supabase/supabase-js@2';

export type QuotaKind = 'ai_extract' | 'maps' | 'autocomplete';

interface QuotaResult {
  allowed: boolean;
  scope: 'user' | 'global' | 'auth';
  used: number;
  limit: number;
}

/**
 * Returns null when the call may proceed, otherwise the Response to send back
 * (401 not signed in, 429 quota reached, 503 quota check unavailable).
 * Fails closed: if the check itself errors, the paid API is NOT called.
 */
export async function checkQuota(
  req: Request,
  kind: QuotaKind,
  cost: number,
  headers: Record<string, string>,
): Promise<Response | null> {
  const reply = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });

  const authorization = req.headers.get('Authorization') ?? '';
  // Run as the caller so auth.uid() inside consume_quota is their id. The
  // anon key alone (no user session) is refused by consume_quota.
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('consume_quota', { p_kind: kind, p_cost: Math.max(1, Math.ceil(cost)) });
  if (error) {
    // An anon-key caller has no EXECUTE grant: treat as "not signed in".
    if (error.code === '42501') return reply({ error: 'auth_required' }, 401);
    console.error('[quota] consume_quota failed:', error.message);
    return reply({ error: 'quota_unavailable' }, 503);
  }

  const result = data as QuotaResult;
  if (result.allowed) return null;
  if (result.scope === 'auth') return reply({ error: 'auth_required' }, 401);
  return reply({ error: 'quota_exceeded', kind, scope: result.scope, limit: result.limit }, 429);
}
