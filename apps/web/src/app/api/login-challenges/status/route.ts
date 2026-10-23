import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/admin';
import { secretsMatch } from '@/lib/login-challenge';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const id = body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' ? body.id : '';
  const secret = body && typeof body === 'object' && 'secret' in body && typeof body.secret === 'string' ? body.secret : '';
  if (!id || !secret) {
    return NextResponse.json({ error: 'missing' }, { status: 400 });
  }

  const admin = getServiceClient();
  if (!admin) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const { data: challenge } = await admin
    .from('login_challenges')
    .select('id, secret_hash, status, approved_by, expires_at')
    .eq('id', id)
    .maybeSingle();

  if (!challenge || !secretsMatch(secret, challenge.secret_hash)) {
    return NextResponse.json({ error: 'mismatch' }, { status: 403 });
  }
  if (new Date(challenge.expires_at).getTime() < Date.now() && challenge.status === 'pending') {
    return NextResponse.json({ status: 'expired' });
  }
  if (challenge.status === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }
  if (challenge.status === 'consumed' || !challenge.approved_by) {
    return NextResponse.json({ status: challenge.status === 'consumed' ? 'consumed' : 'pending' });
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(challenge.approved_by);
  const email = userData.user?.email;
  if (userError || !email) {
    return NextResponse.json({ error: 'email' }, { status: 409 });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return NextResponse.json({ error: 'link' }, { status: 500 });
  }

  await admin.from('login_challenges').update({ status: 'consumed' }).eq('id', id);

  return NextResponse.json({ status: 'ready', tokenHash });
}
