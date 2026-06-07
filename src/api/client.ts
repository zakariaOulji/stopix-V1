import { ENV } from '@/config/env';
import { getToken } from './authToken';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  /** Override the default Authorization behaviour. */
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, headers = {}, auth = true, signal } = opts;
  const token = auth ? getToken() : null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENV.REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${ENV.API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ?? controller.signal,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && 'message' in data && String(data.message)) ||
        `Request failed (${res.status})`;
      throw new ApiError(message, res.status, data);
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('La requête a expiré. Vérifiez votre connexion.', 408, null);
    }
    throw new ApiError('Impossible de joindre le serveur.', 0, err);
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};
