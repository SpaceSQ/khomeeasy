import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';
import { getServiceClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const body = (await request.json().catch(() => null)) as {
    street?: unknown;
    city?: unknown;
    postalCode?: unknown;
    countryCode?: unknown;
  } | null;
  const street = typeof body?.street === 'string' ? body.street.trim() : '';
  const city = typeof body?.city === 'string' ? body.city.trim() : '';
  const postalCode = typeof body?.postalCode === 'string' ? body.postalCode.trim() : '';
  const countryCode = typeof body?.countryCode === 'string' ? body.countryCode.trim() : 'DE';
  if (!token || !street || !city || !postalCode) {
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

  const point = await geocodeAddress({ street, city, postalCode, countryCode });
  if (!point) {
    return NextResponse.json({ error: 'not_found' }, { status: 422 });
  }

  const { error } = await admin
    .from('profiles')
    .update({ latitude: point.latitude, longitude: point.longitude })
    .eq('id', userData.user.id);
  if (error) {
    return NextResponse.json({ error: 'save' }, { status: 500 });
  }

  return NextResponse.json(point);
}
