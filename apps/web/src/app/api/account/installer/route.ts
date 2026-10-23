import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';
import { getServiceClient } from '@/lib/supabase/admin';

type InstallerBody = {
  companyName?: unknown;
  city?: unknown;
  postalCode?: unknown;
  countryCode?: unknown;
  streetAddress?: unknown;
  houseNumber?: unknown;
};

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const body = (await request.json().catch(() => null)) as InstallerBody | null;
  const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
  const city = typeof body?.city === 'string' ? body.city.trim() : '';
  const postalCode = typeof body?.postalCode === 'string' ? body.postalCode.trim() : '';
  const countryCode = typeof body?.countryCode === 'string' ? body.countryCode.trim() : 'DE';
  const streetAddress = typeof body?.streetAddress === 'string' ? body.streetAddress.trim() : '';
  const houseNumber = typeof body?.houseNumber === 'string' ? body.houseNumber.trim() : '';
  if (!token || !companyName || !city || !postalCode || !streetAddress || !houseNumber) {
    return NextResponse.json({ error: 'missing' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  const admin = getServiceClient();
  if (!url || !anon || !admin) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'session' }, { status: 401 });
  }

  const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (profile?.role !== 'installer') {
    return NextResponse.json({ error: 'role' }, { status: 403 });
  }

  const point = await geocodeAddress({
    street: streetAddress,
    houseNumber,
    city,
    postalCode,
    countryCode
  });
  const location = {
    company_name: companyName,
    city,
    postal_code: postalCode,
    country_code: countryCode,
    street_address: streetAddress,
    house_number: houseNumber,
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null
  };

  const { data: existing } = await admin
    .from('installers')
    .select('id')
    .eq('claimed_by_user_id', userData.user.id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .from('installers')
      .update(location)
      .eq('id', existing.id);
    if (error) {
      return NextResponse.json({ error: 'update' }, { status: 500 });
    }
    return NextResponse.json({ id: existing.id });
  }

  const { data: created, error } = await admin
    .from('installers')
    .insert({
      claimed_by_user_id: userData.user.id,
      ...location,
      knx_official_rank: 'Silver',
      is_contact_public: false,
      subscription_tier: 'free'
    })
    .select('id')
    .single();

  if (error || !created?.id) {
    return NextResponse.json({ error: 'create' }, { status: 500 });
  }

  return NextResponse.json({ id: created.id });
}
