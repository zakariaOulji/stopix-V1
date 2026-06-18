import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';

export interface ExtractedDelivery {
  address: string;
  recipient?: string;
  phone?: string;
  packages?: number;
  vrac?: number;
}

const MOCK: ExtractedDelivery[] = [
  { address: '12 Rue de Rivoli, 75004 Paris', recipient: 'Boulangerie Rivoli', packages: 2, vrac: 0 },
  { address: '8 Avenue Parmentier, 75011 Paris', recipient: 'M. Dupont', phone: '0601020304', packages: 1, vrac: 1 },
  { address: '25 Rue du Bac, 75007 Paris', packages: 1, vrac: 0 },
];

export const aiService = {
  /** Extract delivery stops from a photo of a route sheet (GPT-4o vision). */
  async extractAddresses(imageBase64: string, mimeType: string): Promise<ExtractedDelivery[]> {
    if (ENV.USE_MOCKS) return MOCK;
    const { data, error } = await supabase.functions.invoke('extract-addresses', {
      body: { imageBase64, mimeType },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return (data?.deliveries ?? []) as ExtractedDelivery[];
  },
};
