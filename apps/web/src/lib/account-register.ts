import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { geocodeAddress } from '@/lib/geocode';
import type { RegisterInput } from '@/lib/register-input';

type AuthErrorLike = { code?: string; message?: string } | null | undefined;

function alreadyRegistered(error: AuthErrorLike): boolean {
  if (!error) {
    return false;
  }
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  return (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    message.includes('already been registered') ||
    message.includes('already registered')
  );
}

function emailNotConfirmed(error: AuthErrorLike): boolean {
  if (!error) {
    return false;
  }
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  return code === 'email_not_confirmed' || message.includes('email not confirmed');
}

async function userIdForEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const linked = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const id = linked.data?.user?.id;
  return linked.error || !id ? null : id;
}

/** Creates or confirms the Auth user. Supabase stores the password; this function does not. */
export async function registerConfirmedAccount(
  admin: SupabaseClient,
  url: string,
  anonKey: string,
  input: RegisterInput
): Promise<'ok' | 'rejected' | 'failed'> {
  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, locale: input.locale }
  });

  let userId = created.data.user?.id ?? null;
  if (created.error || !userId) {
    if (!alreadyRegistered(created.error)) {
      return 'failed';
    }
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const probe = await anon.auth.signInWithPassword({ email: input.email, password: input.password });
    if (probe.data.user?.id) {
      userId = probe.data.user.id;
    } else if (emailNotConfirmed(probe.error)) {
      userId = await userIdForEmail(admin, input.email);
      if (!userId) {
        return 'failed';
      }
      const confirmed = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      if (confirmed.error) {
        return 'failed';
      }
    } else {
      return 'rejected';
    }
  }

  const profile = {
    role: input.role,
    full_name: input.fullName || null,
    locale: input.locale,
    country_code: input.countryCode,
    postal_code: input.postalCode,
    city: input.city,
    house_number: input.houseNumber || null,
    address_line: input.streetAddress,
    area_sqm: input.areaSqm,
    floors: input.floors,
    room_count: input.roomCount
  };
  const updated = await admin.from('profiles').update(profile).eq('id', userId).select('role').maybeSingle();
  if (updated.error) {
    return 'failed';
  }
  if (!updated.data) {
    const inserted = await admin.from('profiles').insert({ id: userId, ...profile }).select('role').maybeSingle();
    if (inserted.error || inserted.data?.role !== input.role) {
      return 'failed';
    }
  } else if (updated.data.role !== input.role) {
    return 'failed';
  }

  if (input.role === 'homeowner') {
    const point = await geocodeAddress({
      street: input.streetAddress,
      houseNumber: input.houseNumber,
      city: input.city,
      postalCode: input.postalCode,
      countryCode: input.countryCode
    });
    if (point) {
      await admin.from('profiles').update({ latitude: point.latitude, longitude: point.longitude }).eq('id', userId);
    }
    return 'ok';
  }

  const point = await geocodeAddress({
    street: input.streetAddress,
    houseNumber: input.houseNumber,
    city: input.city,
    postalCode: input.postalCode,
    countryCode: input.countryCode
  });
  const location = {
    company_name: input.companyName,
    city: input.city,
    postal_code: input.postalCode,
    country_code: input.countryCode,
    street_address: input.streetAddress,
    house_number: input.houseNumber,
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null
  };
  const existing = await admin.from('installers').select('id').eq('claimed_by_user_id', userId).maybeSingle();
  if (existing.error) {
    return 'failed';
  }
  if (existing.data?.id) {
    const saved = await admin.from('installers').update(location).eq('id', existing.data.id);
    return saved.error ? 'failed' : 'ok';
  }
  const inserted = await admin
    .from('installers')
    .insert({
      claimed_by_user_id: userId,
      ...location,
      knx_official_rank: 'Silver',
      is_contact_public: false,
      subscription_tier: 'free'
    })
    .select('id')
    .maybeSingle();
  return inserted.error || !inserted.data?.id ? 'failed' : 'ok';
}
