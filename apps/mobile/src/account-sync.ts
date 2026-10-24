import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountRole } from './storage';

export type ProfileWrite = {
  role: AccountRole;
  fullName: string;
  locale: 'de-DE' | 'en-GB';
  countryCode: string;
  postalCode: string;
  city: string;
  houseNumber: string;
  addressLine: string;
  areaSqm: number | null;
  floors: number | null;
  roomCount: number | null;
};

type AuthErrorLike = { code?: string; message?: string } | null | undefined;

export function emailConfirmationRequired(error: AuthErrorLike): boolean {
  if (!error) {
    return false;
  }
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  return code === 'email_not_confirmed' || message.includes('email not confirmed');
}

export async function writeAccountProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileWrite
): Promise<boolean> {
  const row = {
    role: input.role,
    full_name: input.fullName.trim() || null,
    locale: input.locale,
    country_code: input.countryCode,
    postal_code: input.postalCode.trim(),
    city: input.city.trim() || null,
    house_number: input.houseNumber.trim() || null,
    address_line: input.addressLine.trim() || null,
    area_sqm: input.areaSqm,
    floors: input.floors,
    room_count: input.roomCount
  };
  const updated = await supabase.from('profiles').update(row).eq('id', userId).select('role').maybeSingle();
  if (!updated.error && updated.data?.role === input.role) {
    return true;
  }
  if (updated.error) {
    return false;
  }
  const inserted = await supabase.from('profiles').insert({ id: userId, ...row }).select('role').maybeSingle();
  return !inserted.error && inserted.data?.role === input.role;
}

/** profiles.role must match the account role chosen on this phone. */
export async function ensureAccountRole(
  supabase: SupabaseClient,
  userId: string,
  role: AccountRole
): Promise<'ready' | 'mismatch' | 'failed'> {
  const current = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (current.error) {
    return 'failed';
  }
  if (current.data?.role === role) {
    return 'ready';
  }
  const updated = await supabase.from('profiles').update({ role }).eq('id', userId).select('role').maybeSingle();
  if (updated.error) {
    return 'failed';
  }
  if (updated.data?.role === role) {
    return 'ready';
  }
  if (updated.data) {
    return 'mismatch';
  }
  const inserted = await supabase.from('profiles').insert({ id: userId, role }).select('role').maybeSingle();
  if (inserted.error) {
    return 'failed';
  }
  return inserted.data?.role === role ? 'ready' : 'mismatch';
}
