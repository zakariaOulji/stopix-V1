import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';
import { statsMock, fakeDelay } from '@/mocks';
import type { Stats } from '@/types';

export const statsService = {
  async getStats(): Promise<Stats> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(400);
      return statsMock;
    }
    const { data, error } = await supabase.rpc('get_stats');
    if (error) throw new Error(error.message);
    // get_stats() returns a JSON object already shaped like `Stats`.
    return data as Stats;
  },
};
