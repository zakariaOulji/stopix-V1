/**
 * Minimum password length. Must match Supabase → Authentication → Providers →
 * Email → "Minimum password length" (set to 8 on 2026-10-27): the server is the
 * real check, this only gives the driver an immediate, readable error.
 */
export const MIN_PASSWORD_LENGTH = 8;
