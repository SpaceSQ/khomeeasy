import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  allowsProjectUnlock,
  chooseProjectForPass,
  productKindForId,
  subscriptionIsActive,
  type ProductKind,
  type PurchaseAccountView,
  type PurchaseMode,
  type PurchaseReceiptView
} from '@khomeeasy/shared-types';
import { PurchaseFlowError, verifyAppleSignedTransaction, type VerifiedAppleTransaction } from './apple-verify';

type ReceiptRow = {
  user_id: string;
  transaction_id: string;
  product_id: string;
  product_kind: ProductKind;
  price_milliunits: number;
  currency: string;
  purchased_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  project_id: string | null;
};

type ProjectRow = {
  id: string;
  title: string;
  is_pro_unlocked: boolean | null;
  stripe_payment_id: string | null;
  created_at: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PurchaseRequest = {
  signedTransaction: string;
  mode: PurchaseMode;
  designTitle: string;
  projectId: string | null;
  buildType: 'new_build' | 'renovation' | 'unsure';
  constructionPhase: 'design' | 'shell_construction' | 'finished' | null;
  areaSqm: number | null;
};

export function parsePurchaseRequest(body: unknown): PurchaseRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  const signedTransaction = typeof record.signedTransaction === 'string' ? record.signedTransaction.trim() : '';
  const mode = record.mode === 'restore' ? 'restore' : record.mode === 'purchase' ? 'purchase' : null;
  if (!signedTransaction || !mode) {
    return null;
  }
  const designTitle = typeof record.designTitle === 'string' ? record.designTitle.trim().slice(0, 120) : '';
  const projectId = typeof record.projectId === 'string' && UUID.test(record.projectId) ? record.projectId : null;
  const buildType =
    record.buildType === 'new_build' || record.buildType === 'renovation' || record.buildType === 'unsure'
      ? record.buildType
      : 'unsure';
  const constructionPhase =
    record.constructionPhase === 'design' || record.constructionPhase === 'finished'
      ? record.constructionPhase
      : record.constructionPhase === 'shell' || record.constructionPhase === 'shell_construction'
        ? 'shell_construction'
        : null;
  const areaSqm =
    typeof record.areaSqm === 'number' && Number.isInteger(record.areaSqm) && record.areaSqm > 0 && record.areaSqm < 100000
      ? record.areaSqm
      : null;
  return { signedTransaction, mode, designTitle, projectId, buildType, constructionPhase, areaSqm };
}

function receiptView(row: ReceiptRow, titles: Map<string, string>): PurchaseReceiptView {
  return {
    transactionId: row.transaction_id,
    productKind: row.product_kind,
    priceMilliunits: row.price_milliunits,
    currency: row.currency,
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at,
    projectId: row.project_id,
    projectTitle: row.project_id ? titles.get(row.project_id) ?? null : null
  };
}

async function loadReceipts(admin: SupabaseClient, userId: string): Promise<ReceiptRow[]> {
  const result = await admin
    .from('apple_purchase_receipts')
    .select('user_id, transaction_id, product_id, product_kind, price_milliunits, currency, purchased_at, expires_at, revoked_at, project_id')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });
  if (result.error) {
    console.error('apple receipts', result.error.code);
    throw new PurchaseFlowError('unavailable');
  }
  return (result.data ?? []) as ReceiptRow[];
}

async function loadProjects(admin: SupabaseClient, userId: string): Promise<ProjectRow[]> {
  const result = await admin
    .from('projects')
    .select('id, title, is_pro_unlocked, stripe_payment_id, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (result.error) {
    console.error('apple projects', result.error.code);
    throw new PurchaseFlowError('unavailable');
  }
  return (result.data ?? []) as ProjectRow[];
}

async function refreshSubscription(admin: SupabaseClient, userId: string, receipts: ReceiptRow[]): Promise<boolean> {
  const subscriptionReceipts = receipts.filter((row) => row.product_kind === 'workbench_subscription');
  const now = Date.now();
  const active = subscriptionReceipts.some((row) =>
    subscriptionIsActive({ expiresAt: row.expires_at, revokedAt: row.revoked_at, now })
  );
  const installer = await admin.from('installers').select('id, subscription_tier').eq('claimed_by_user_id', userId).maybeSingle();
  if (installer.error) {
    console.error('apple installer', installer.error.code);
    throw new PurchaseFlowError('unavailable');
  }
  if (!installer.data?.id) {
    return active;
  }
  if (subscriptionReceipts.length === 0) {
    return installer.data.subscription_tier === 'pro';
  }
  const next = active ? 'pro' : 'free';
  if (installer.data.subscription_tier !== next) {
    const updated = await admin.from('installers').update({ subscription_tier: next }).eq('id', installer.data.id);
    if (updated.error) {
      console.error('apple subscription', updated.error.code);
      throw new PurchaseFlowError('unavailable');
    }
  }
  return active;
}

export async function purchaseAccount(admin: SupabaseClient, userId: string): Promise<PurchaseAccountView> {
  const [receipts, projects, profile] = await Promise.all([
    loadReceipts(admin, userId),
    loadProjects(admin, userId),
    admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  ]);
  const titles = new Map(projects.map((project) => [project.id, project.title]));
  const subscriptionActive = await refreshSubscription(admin, userId, receipts);
  const installer = await admin.from('installers').select('id').eq('claimed_by_user_id', userId).maybeSingle();
  return {
    receipts: receipts.map((row) => receiptView(row, titles)),
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      isProUnlocked: project.is_pro_unlocked === true
    })),
    subscriptionActive,
    installerProfileMissing:
      profile.data?.role === 'installer' &&
      !installer.data?.id &&
      receipts.some((row) => row.product_kind === 'workbench_subscription')
  };
}

async function insertReceipt(
  admin: SupabaseClient,
  userId: string,
  verified: VerifiedAppleTransaction,
  installerId: string | null
): Promise<ReceiptRow | 'exists'> {
  const inserted = await admin
    .from('apple_purchase_receipts')
    .insert({
      user_id: userId,
      transaction_id: verified.transactionId,
      original_transaction_id: verified.originalTransactionId,
      product_id: verified.productId,
      product_kind: verified.productKind,
      price_milliunits: verified.priceMilliunits,
      currency: verified.currency,
      purchased_at: verified.purchasedAt,
      expires_at: verified.expiresAt,
      revoked_at: verified.revokedAt,
      environment: verified.environment,
      project_id: null,
      installer_id: installerId
    })
    .select('user_id, transaction_id, product_id, product_kind, price_milliunits, currency, purchased_at, expires_at, revoked_at, project_id')
    .maybeSingle();
  if (inserted.error?.code === '23505') {
    return 'exists';
  }
  if (inserted.error || !inserted.data) {
    console.error('apple receipt insert', inserted.error?.code);
    throw new PurchaseFlowError('unavailable');
  }
  return inserted.data as ReceiptRow;
}

async function bindProject(
  admin: SupabaseClient,
  userId: string,
  verified: VerifiedAppleTransaction,
  request: PurchaseRequest
): Promise<void> {
  const projects = await loadProjects(admin, userId);
  const already = projects.find((project) => project.stripe_payment_id === verified.transactionId);
  if (already) {
    if (already.is_pro_unlocked !== true) {
      const updated = await admin
        .from('projects')
        .update({ is_pro_unlocked: true })
        .eq('id', already.id)
        .eq('owner_id', userId);
      if (updated.error) {
        console.error('apple project unlock', updated.error.code);
        throw new PurchaseFlowError('unavailable');
      }
    }
    const linked = await admin
      .from('apple_purchase_receipts')
      .update({ project_id: already.id })
      .eq('transaction_id', verified.transactionId)
      .eq('user_id', userId);
    if (linked.error) {
      console.error('apple receipt link', linked.error.code);
      throw new PurchaseFlowError('unavailable');
    }
    return;
  }
  const choice = chooseProjectForPass({
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      unlocked: project.is_pro_unlocked === true
    })),
    requestedProjectId: request.projectId,
    designTitle: request.designTitle || 'KHomeEasy'
  });
  let projectId = choice.kind === 'existing' ? choice.id : null;
  if (choice.kind === 'create') {
    const created = await admin
      .from('projects')
      .insert({
        owner_id: userId,
        title: choice.title,
        build_type: request.buildType,
        construction_phase: request.constructionPhase,
        area_sqm: request.areaSqm,
        is_pro_unlocked: true,
        stripe_payment_id: verified.transactionId
      })
      .select('id')
      .single();
    if (created.error || !created.data?.id) {
      console.error('apple project create', created.error?.code);
      throw new PurchaseFlowError('unavailable');
    }
    projectId = created.data.id as string;
  } else {
    const updated = await admin
      .from('projects')
      .update({ is_pro_unlocked: true, stripe_payment_id: verified.transactionId })
      .eq('id', projectId)
      .eq('owner_id', userId);
    if (updated.error) {
      console.error('apple project unlock', updated.error.code);
      throw new PurchaseFlowError('unavailable');
    }
  }
  const linked = await admin
    .from('apple_purchase_receipts')
    .update({ project_id: projectId })
    .eq('transaction_id', verified.transactionId)
    .eq('user_id', userId);
  if (linked.error) {
    console.error('apple receipt link', linked.error.code);
    throw new PurchaseFlowError('unavailable');
  }
}

function roleAllows(role: string | null, kind: ProductKind): boolean {
  if (kind === 'project_pass') {
    return role === 'homeowner';
  }
  return role === 'installer';
}

export async function fulfillApplePurchase(
  admin: SupabaseClient,
  userId: string,
  request: PurchaseRequest
): Promise<PurchaseAccountView> {
  const verified = await verifyAppleSignedTransaction(request.signedTransaction);
  if (verified.appAccountToken && verified.appAccountToken.toLowerCase() !== userId.toLowerCase()) {
    throw new PurchaseFlowError('account');
  }
  const profile = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile.error) {
    console.error('apple profile', profile.error.code);
    throw new PurchaseFlowError('unavailable');
  }
  const role = typeof profile.data?.role === 'string' ? profile.data.role : null;
  if (!profile.data) {
    throw new PurchaseFlowError('session');
  }
  if (!roleAllows(role, verified.productKind)) {
    throw new PurchaseFlowError('role');
  }
  if (!productKindForId(verified.productId)) {
    throw new PurchaseFlowError('product');
  }

  const existingResult = await admin
    .from('apple_purchase_receipts')
    .select('user_id, transaction_id, product_id, product_kind, price_milliunits, currency, purchased_at, expires_at, revoked_at, project_id')
    .eq('transaction_id', verified.transactionId)
    .maybeSingle();
  if (existingResult.error) {
    console.error('apple receipt read', existingResult.error.code);
    throw new PurchaseFlowError('unavailable');
  }
  const existing = (existingResult.data as ReceiptRow | null) ?? null;
  if (existing && existing.user_id !== userId) {
    throw new PurchaseFlowError('conflict');
  }

  if (request.mode === 'restore' && verified.productKind === 'project_pass' && !existing) {
    throw new PurchaseFlowError('pass_not_restored');
  }

  const installer = await admin.from('installers').select('id').eq('claimed_by_user_id', userId).maybeSingle();
  const installerId = typeof installer.data?.id === 'string' ? installer.data.id : null;

  if (!existing) {
    const inserted = await insertReceipt(admin, userId, verified, installerId);
    if (inserted === 'exists') {
      const again = await admin
        .from('apple_purchase_receipts')
        .select('user_id')
        .eq('transaction_id', verified.transactionId)
        .maybeSingle();
      if (again.data?.user_id && again.data.user_id !== userId) {
        throw new PurchaseFlowError('conflict');
      }
    }
  } else if (verified.revokedAt && existing.revoked_at == null) {
    await admin
      .from('apple_purchase_receipts')
      .update({ revoked_at: verified.revokedAt })
      .eq('transaction_id', verified.transactionId)
      .eq('user_id', userId);
  }

  const stored = existing ?? (await loadReceipts(admin, userId)).find((row) => row.transaction_id === verified.transactionId);
  const revoked = Boolean(verified.revokedAt || stored?.revoked_at);
  if (allowsProjectUnlock(request.mode, verified.productKind) && !revoked && stored && !stored.project_id) {
    await bindProject(admin, userId, verified, request);
  }
  if (revoked && stored?.project_id) {
    const project = await admin.from('projects').select('stripe_payment_id').eq('id', stored.project_id).maybeSingle();
    if (project.data?.stripe_payment_id === verified.transactionId) {
      await admin.from('projects').update({ is_pro_unlocked: false }).eq('id', stored.project_id).eq('owner_id', userId);
    }
  }

  return purchaseAccount(admin, userId);
}
