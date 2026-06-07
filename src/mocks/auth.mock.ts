import type { User } from '@/types';

/** The signed-in driver used across the mocked app. */
export const authMock: User = {
  id: 'user-1',
  full_name: 'Karim Benali',
  email: 'karim@stopix.app',
  avatar_url: null,
  role: 'driver',
  vehicle: 'moto',
  employment: 'independant',
};
