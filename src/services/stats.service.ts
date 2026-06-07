import { ENV } from '@/config/env';
import { api } from '@/api';
import { statsMock, fakeDelay } from '@/mocks';
import type { Stats } from '@/types';

export const statsService = {
  async getStats(): Promise<Stats> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(400);
      return statsMock;
    }
    return api.get<Stats>('/stats');
  },
};
