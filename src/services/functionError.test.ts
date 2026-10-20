import { QuotaExceededError, toFunctionError } from './functionError';

const httpError = (status: number, body: unknown) => ({
  message: 'Edge Function returned a non-2xx status code',
  context: new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
});

describe('toFunctionError', () => {
  it('turns a per-user quota refusal into a readable QuotaExceededError', async () => {
    const e = await toFunctionError(httpError(429, { error: 'quota_exceeded', kind: 'ai_extract', scope: 'user', limit: 20 }));
    expect(e).toBeInstanceOf(QuotaExceededError);
    expect(e.message).toBe('Limite quotidienne atteinte (20 imports de feuille de route par photo par jour). Réessaie demain.');
  });

  it('explains a global cap without blaming the driver', async () => {
    const e = await toFunctionError(httpError(429, { error: 'quota_exceeded', kind: 'maps', scope: 'global', limit: 1000 }));
    expect(e).toBeInstanceOf(QuotaExceededError);
    expect(e.message).toMatch(/saturé/);
  });

  it('asks to sign in when the call had no user session', async () => {
    const e = await toFunctionError(httpError(401, { error: 'auth_required' }));
    expect(e).toBeInstanceOf(QuotaExceededError);
    expect(e.message).toMatch(/Connecte-toi/);
  });

  it('keeps other function errors as plain errors', async () => {
    const e = await toFunctionError(httpError(502, { error: 'OpenAI error' }));
    expect(e).not.toBeInstanceOf(QuotaExceededError);
    expect(e.message).toBe('OpenAI error');
  });

  it('falls back to the original error when there is no HTTP body', async () => {
    const e = await toFunctionError(new Error('network down'));
    expect(e.message).toBe('network down');
  });
});
