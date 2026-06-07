import { ENV } from '@/config/env';
import { api } from '@/api';
import { authMock, fakeDelay } from '@/mocks';
import type { DriverRole, EmploymentType, User, VehicleType } from '@/types';

export interface AuthResult {
  user: User;
  token: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password?: string;
  employment?: EmploymentType;
  vehicle?: VehicleType;
  avatar_url?: string | null;
}

/** Backend user DTO (snake_case) -> domain User. */
interface UserDTO {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: DriverRole;
  vehicle: VehicleType;
  employment?: EmploymentType;
}
interface AuthDTO {
  user: UserDTO;
  token: string;
}

function mapUser(dto: UserDTO): User {
  return {
    id: dto.id,
    full_name: dto.full_name,
    email: dto.email,
    avatar_url: dto.avatar_url ?? null,
    role: dto.role,
    vehicle: dto.vehicle,
    employment: dto.employment,
  };
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(1000);
      return { user: authMock, token: 'mock-token' };
    }
    const dto = await api.post<AuthDTO>('/auth/login', { email, password }, { auth: false });
    return { user: mapUser(dto.user), token: dto.token };
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(1500);
      return {
        user: {
          ...authMock,
          full_name: payload.full_name || authMock.full_name,
          email: payload.email || authMock.email,
          employment: payload.employment ?? authMock.employment,
          vehicle: payload.vehicle ?? authMock.vehicle,
          avatar_url: payload.avatar_url ?? null,
        },
        token: 'mock-token',
      };
    }
    const dto = await api.post<AuthDTO>('/auth/register', payload, { auth: false });
    return { user: mapUser(dto.user), token: dto.token };
  },

  /** Fetch the current user from a stored token (used to restore a session). */
  async me(): Promise<User> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(300);
      return authMock;
    }
    return mapUser(await api.get<UserDTO>('/auth/me'));
  },

  async logout(): Promise<void> {
    if (ENV.USE_MOCKS) return;
    await api.post('/auth/logout').catch(() => {});
  },
};
