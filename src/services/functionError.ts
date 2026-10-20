/**
 * Errors returned by the paid edge functions (geocode, extract-addresses).
 * Quota / auth refusals become a `QuotaExceededError` with a message ready to
 * show the driver; see supabase/functions/_shared/quota.ts.
 */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

interface FunctionErrorBody {
  error?: string;
  kind?: 'ai_extract' | 'maps' | 'autocomplete';
  scope?: 'user' | 'global';
  limit?: number;
}

const WHAT: Record<NonNullable<FunctionErrorBody['kind']>, string> = {
  ai_extract: 'imports de feuille de route par photo',
  maps: "recherches d'adresses et calculs d'itinéraire",
  autocomplete: "suggestions d'adresses",
};

function quotaMessage(body: FunctionErrorBody): string {
  if (body.error === 'auth_required') return 'Connecte-toi pour utiliser cette fonction.';
  if (body.scope === 'global') return 'Service momentanément saturé. Réessaie demain ou saisis les adresses à la main.';
  const what = body.kind ? WHAT[body.kind] : 'utilisations';
  return `Limite quotidienne atteinte (${body.limit ?? '?'} ${what} par jour). Réessaie demain.`;
}

/**
 * Turn a `supabase.functions.invoke` error into an Error to throw. supabase-js
 * puts the HTTP Response in `error.context` for non-2xx replies.
 */
export async function toFunctionError(error: unknown): Promise<Error> {
  const response = (error as { context?: unknown })?.context;
  if (response instanceof Response) {
    try {
      const body = (await response.clone().json()) as FunctionErrorBody;
      if (body.error === 'quota_exceeded' || body.error === 'auth_required') {
        return new QuotaExceededError(quotaMessage(body));
      }
      if (body.error) return new Error(body.error);
    } catch {
      // not JSON: fall through
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}
