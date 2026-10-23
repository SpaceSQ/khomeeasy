import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/admin';
import { isAccountRole, secretsMatch } from '@/lib/login-challenge';

export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const body: unknown = await request.json().catch(() => null);
  const id = body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' ? body.id : '';
  const secret = body && typeof body === 'object' && 'secret' in body && typeof body.secret === 'string' ? body.secret : '';
  if (!token || !id || !secret) {
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
  const user = userData.user;
  if (userError || !user) {
    return NextResponse.json({ error: 'session' }, { status: 401 });
  }

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role;
  if (!isAccountRole(role)) {
    return NextResponse.json({ error: 'role' }, { status: 403 });
  }

  const { data: challenge } = await admin
    .from('login_challenges')
    .select('id, secret_hash, role, status, expires_at')
    .eq('id', id)
    .maybeSingle();

  if (!challenge || challenge.status !== 'pending' || new Date(challenge.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  if (challenge.role !== role || !secretsMatch(secret, challenge.secret_hash)) {
    return NextResponse.json({ error: 'mismatch' }, { status: 403 });
  }

  const { error } = await admin
    .from('login_challenges')
    .update({ status: 'approved', approved_by: user.id })
    .eq('id', id)
    .eq('status', 'pending');

  if (error) {
    return NextResponse.json({ error: 'approve' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
