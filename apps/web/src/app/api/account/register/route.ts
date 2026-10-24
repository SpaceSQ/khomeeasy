import { NextResponse } from 'next/server';
import { registerConfirmedAccount } from '@/lib/account-register';
import { parseRegisterBody } from '@/lib/register-input';
import { getServiceClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const input = parseRegisterBody(body);
  if (!input) {
    return NextResponse.json({ error: 'missing' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  const admin = getServiceClient();
  if (!url || !anon || !admin) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const result = await registerConfirmedAccount(admin, url, anon, input);
  if (result === 'rejected') {
    return NextResponse.json({ error: 'credentials' }, { status: 401 });
  }
  if (result === 'failed') {
    return NextResponse.json({ error: 'register' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
