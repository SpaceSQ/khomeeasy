import type { PurchaseAccountView, PurchaseMode } from '@khomeeasy/shared-types';
import { getMobileSupabase, webOrigin } from './supabase';

export class PurchaseRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function accessToken(): Promise<string | null> {
  const supabase = getMobileSupabase();
  if (!supabase) {
    return null;
  }
  const session = (await supabase.auth.getSession()).data.session;
  return session?.access_token ?? null;
}

export async function loadPurchaseAccount(): Promise<PurchaseAccountView | null> {
  const token = await accessToken();
  if (!token) {
    return null;
  }
  const response = await fetch(`${webOrigin}/api/apple/purchases`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new PurchaseRequestError('failed');
  }
  return (await response.json()) as PurchaseAccountView;
}

export async function sendSignedTransaction(input: {
  signedTransaction: string;
  mode: PurchaseMode;
  designTitle?: string;
  projectId?: string | null;
  buildType?: string | null;
  constructionPhase?: string | null;
  areaSqm?: number | null;
}): Promise<PurchaseAccountView> {
  const token = await accessToken();
  if (!token) {
    throw new PurchaseRequestError('needAccount');
  }
  const response = await fetch(`${webOrigin}/api/apple/purchases`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      signedTransaction: input.signedTransaction,
      mode: input.mode,
      designTitle: input.designTitle ?? '',
      projectId: input.projectId ?? null,
      buildType: input.buildType ?? null,
      constructionPhase: input.constructionPhase ?? null,
      areaSqm: input.areaSqm ?? null
    })
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new PurchaseRequestError(body?.error || 'failed');
  }
  return (await response.json()) as PurchaseAccountView;
}

const claimedTransactions = new Set<string>();

/** One in-flight server check per transaction. A second call from the store listener is ignored. */
export function claimTransaction(transactionId: string): boolean {
  if (claimedTransactions.has(transactionId)) {
    return false;
  }
  claimedTransactions.add(transactionId);
  return true;
}

export function releaseTransaction(transactionId: string): void {
  claimedTransactions.delete(transactionId);
}
