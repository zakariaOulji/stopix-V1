import { useEffect, useState } from 'react';
import { storageService } from '@/services';

/**
 * Signed URL for a proof stored in the private `proofs` bucket.
 * Pass `stop.proofUrl` / `stop.signatureUrl` (a bucket path); the URL is
 * generated at display time and expires after an hour.
 */
export function useProofUrl(path?: string): { url: string | null; error: string | null } {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    setError(null);
    if (!path) return;
    let active = true;
    storageService
      .getProofUrl(path)
      .then((u) => active && setUrl(u))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, [path]);

  return { url, error };
}
