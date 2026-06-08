import { ENV } from '@/config/env';
import { supabase } from '@/api/supabase';
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

/** profiles row (snake_case) -> domain User. */
interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: DriverRole;
  vehicle: VehicleType;
  employment: EmploymentType | null;
}

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email ?? '',
    avatar_url: row.avatar_url,
    role: row.role,
    vehicle: row.vehicle,
    employment: row.employment ?? undefined,
  };
}

/** Build a User from the Supabase auth user (metadata) when the profile row
 *  isn't readable yet (no session, or trigger lag). */
function userFromAuth(
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  payload?: Partial<RegisterPayload>,
): User {
  const m = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    full_name: (m.full_name as string) ?? payload?.full_name ?? '',
    email: authUser.email ?? payload?.email ?? '',
    avatar_url: (m.avatar_url as string) ?? null,
    role: 'driver',
    vehicle: ((m.vehicle as User['vehicle']) ?? payload?.vehicle ?? 'moto'),
    employment: (m.employment as User['employment']) ?? payload?.employment ?? 'independant',
  };
}

/** Returns the profile row mapped, or null if it isn't readable. */
async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    if (ENV.USE_MOCKS) {
      await fakeDelay(1000);
      return { user: authMock, token: 'mock-token' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const user = (await fetchProfile(data.user.id)) ?? userFromAuth(data.user);
    return { user, token: data.session?.access_token ?? '' };
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
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password ?? '',
      options: {
        data: {
          full_name: payload.full_name,
          vehicle: payload.vehicle ?? 'moto',
          employment: payload.employment ?? 'independant',
        },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Inscription incomplète — réessayez.');
    // Build the user from the signup payload (no profile SELECT needed — avoids
    // RLS/trigger-timing issues). The DB trigger creates the profile row for
    // later authenticated queries.
    const profile = data.session ? await fetchProfile(data.user.id) : null;
    const user = profile ?? userFromAuth(data.user, payload);
    return { user, token: data.session?.access_token ?? '' };
  },

  /** Restore the current user from an existing session (or null). */
  async me(): Promise<User | null> {
    if (ENV.USE_MOCKS) return null;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    return (await fetchProfile(data.session.user.id)) ?? userFromAuth(data.session.user);
  },

  async logout(): Promise<void> {
    if (ENV.USE_MOCKS) return;
    await supabase.auth.signOut();
  },
};
