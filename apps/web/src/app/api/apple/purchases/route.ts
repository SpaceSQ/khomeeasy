import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isStoreKitJws } from '@khomeeasy/shared-types';
import { PurchaseFlowError } from '@/lib/apple-verify';
import { fulfillApplePurchase, parsePurchaseRequest, purchaseAccount } from '@/lib/apple-purchase';
import { getServiceClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const statusFor: Record<PurchaseFlowError['code'], number> = {
  missing: 400,
  session: 401,
  role: 403,
  account: 403,
  conflict: 409,
  pass_not_restored: 409,
  unavailable: 503,
  invalid: 400,
  product: 400,
  type: 400
};

async function userIdFromBearer(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!token || !url || !anon) {
    return null;
  }
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}

function failure(error: unknown) {
  if (error instanceof PurchaseFlowError) {
    return NextResponse.json({ error: error.code }, { status: statusFor[error.code] });
  }
  console.error('apple purchase');
  return NextResponse.json({ error: 'unavailable' }, { status: 503 });
}

export async function GET(request: Request) {
  const admin = getServiceClient();
  const userId = await userIdFromBearer(request);
  if (!admin || !userId) {
    return NextResponse.json({ error: 'session' }, { status: 401 });
  }
  try {
    return NextResponse.json(await purchaseAccount(admin, userId));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const admin = getServiceClient();
  const userId = await userIdFromBearer(request);
  if (!admin || !userId) {
    return NextResponse.json({ error: 'session' }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = parsePurchaseRequest(body);
  if (!parsed || !isStoreKitJws(parsed.signedTransaction)) {
    return NextResponse.json({ error: 'missing' }, { status: 400 });
  }
  try {
    return NextResponse.json(await fulfillApplePurchase(admin, userId, parsed));
  } catch (error) {
    return failure(error);
  }
}
