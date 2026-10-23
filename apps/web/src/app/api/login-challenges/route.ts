import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/admin';
import { createPairSecret, hashPairSecret, isAccountRole } from '@/lib/login-challenge';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const role = body && typeof body === 'object' && 'role' in body ? body.role : null;
  if (!isAccountRole(role)) {
    return NextResponse.json({ error: 'role' }, { status: 400 });
  }

  const admin = getServiceClient();
  if (!admin) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const secret = createPairSecret();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from('login_challenges')
    .insert({
      secret_hash: hashPairSecret(secret),
      role,
      expires_at: expiresAt
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return NextResponse.json({ error: 'create' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, secret, role, expiresAt });
}
