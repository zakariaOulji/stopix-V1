import * as FileSystem from 'expo-file-system/legacy';
import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';

export type ProofKind = 'photo' | 'signature';

const BUCKET = 'proofs';

/** A proof, given as a local file uri, raw base64, or a text document (SVG). */
export interface ProofSource {
  uri?: string;
  base64?: string;
  text?: string;
  mime: string;
}

function extFor(mime: string): string {
  return mime.includes('svg') ? 'svg' : mime.includes('png') ? 'png' : 'jpg';
}

/** Write content to a temp file so it can be uploaded natively. */
async function toFileUri(content: string, mime: string, encoding: FileSystem.EncodingType): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}proof-${Date.now()}.${extFor(mime)}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding });
  return uri;
}

export const storageService = {
  /**
   * Upload a proof image to Supabase Storage and return its public URL.
   * Uses expo-file-system's native uploader (runs off the JS thread) instead of
   * supabase-js `storage.upload`, which can hang on React Native.
   */
  async uploadProof(stopId: string, source: ProofSource, kind: ProofKind): Promise<string | null> {
    if (ENV.USE_MOCKS) return `mock://proof/${stopId}/${kind}`;

    let fileUri = source.uri ?? null;
    if (!fileUri && source.base64) fileUri = await toFileUri(source.base64, source.mime, FileSystem.EncodingType.Base64);
    if (!fileUri && source.text) fileUri = await toFileUri(source.text, source.mime, FileSystem.EncodingType.UTF8);
    if (!fileUri) return null;

    const path = `${stopId}/${kind}-${Date.now()}.${extFor(source.mime)}`;
    const baseUrl = ENV.SUPABASE_URL.trim();
    const anon = ENV.SUPABASE_ANON_KEY.trim();
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? anon;

    const res = await FileSystem.uploadAsync(`${baseUrl}/storage/v1/object/${BUCKET}/${path}`, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': source.mime,
        'x-upsert': 'true',
      },
    });

    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`Upload échoué (${res.status}) : ${res.body}`);
    }
    return `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  },
};
